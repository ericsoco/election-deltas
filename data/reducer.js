const fs = require('fs');
const parse = require('csv-parse');
const transform = require('stream-transform');
const d3Collection = require('d3-collection');
const {
	nest
} = d3Collection;

const constants = require('./constants');
const {
	MAJOR_PARTIES,
	PARTY_AFFILIATIONS,
	VALID_STATES
} = constants;


const dataFile = process.argv[2],
	candidates = [],
	candidateMap = {};

let states,
	statesMap;

const parser = parse({
	columns: true,
	delimiter: ',',
	rowDelimiter: '\r\n',
	comment: '~'
});

const transformer = transform(row => {
	const party = row['PARTY'].trim(),
		votes = row['GENERAL VOTES '],
		state = row['STATE ABBREVIATION'];

	if (votes && VALID_STATES[state]) {
		const district = row['D'].substr(0, 2);

		// TODO: vv fix this case vv
		if (isNaN(+votes.replace(',', ''))) console.warn(`votes: ${votes}[${state}]`);

		const candidate = {
			state,
			district,
			party,
			name: row['CANDIDATE NAME'],
			votes: +votes.replace(',', ''),
			pct: +(row['GENERAL %'].replace('%', '')) / 100,
			incumbent: !!row['(I)'],
			won: !!row['GE WINNER INDICATOR']
		};
		candidates.push(candidate);
		candidateMap[`${state}-${district}-${party}`] = candidate;
	}
});

fs.createReadStream(dataFile)
	.pipe(parser)
	.pipe(transformer)
	.on('finish', () => {
		cleanAndReduce();
		calculateMetrics();
	});

function cleanAndReduce () {
	states = nest()
		.key(c => c.state)
		.key(c => c.district)
		.rollup(districtList => {
			// vv vv vv
			// TODO: ensure at least one winner per district (HI D-01)
			// ^^ ^^ ^^
			return districtList;
		})
		.key(c => c.name)
		.rollup(nameList => {
			// only return one entry per name
			if (nameList.length === 1) {
				return nameList[0];
			} else {
				// aggregate all votes for a candidate across parties
				// down to a single major party, if it exists
				let majorCandidate = nameList.find(c => {
					MAJOR_PARTIES[c.party] ||
					MAJOR_PARTIES[PARTY_AFFILIATIONS[c.party]]
				});
				if (!majorCandidate) {
					// if no major party affiliation, use the entry
					// with the most votes to determine party
					majorCandidate = nameList.sort((a, b) => b.votes - a.votes)[0];
				}
				// keep track of all non-major parties for this candidate
				majorCandidate.otherParties = nameList.reduce((acc, c) => c !== majorCandidate ? acc.concat(c.party) : acc, []);
				// aggregate all votes across parties for this candidate,
				// but do not double-count votes in case two entries for same name + party
				majorCandidate.votes += nameList.reduce((acc, c) => c.party !== majorCandidate.party ? acc + c.votes : acc, 0);
				return majorCandidate;
			}

		})
		.entries(candidates);

	// TODO NEXT:
	// reduce to flat array in calculateMetrics
	// that just has winner counts per state
	// and then calc optimalNumRepsD and popularRepresentationDelta from there

	debugger;
}

function calculateMetrics () {

	//
	// TODO: don't tally votes, use totals from FEC data ("District Votes")
	// (actually, just use reported percentages)
	//

	// reduce list of individual candidates into list of stats per state
	const totalReps = {};
	statesMap = candidates.reduce((acc, candidate) => {
		let state = acc[candidate.state];
		if (!state) {
			state = {
				name: candidate.state,
				repsD: 0,
				repsR: 0,
				repsOther: 0,
				votesD: 0,
				votesR: 0,
				votesOther: 0
			};
			acc[candidate.state] = state;
		}

		let {party} = candidate;
		if (candidate.won) {
			if (MAJOR_PARTIES[party]) {
				state[`reps${party}`]++;
			} else {
				state['repsOther']++;
			}

			if (!totalReps[party]) totalReps[party] = 0;
			totalReps[party]++;
		}

		state[`votes${party}`] += candidate.votes;
		return acc;
	}, {});
	console.log(totalReps);

	// flatten states map into list
	states = Object.keys(statesMap)
		.map(k => statesMap[k])

	console.log(states.map(s => `${s.name}: ${s.repsD + s.repsR + s.repsOther}`));

	// calculate useful metrics for each state
	states.forEach(state => {
		const votesRatio = state.votesD / (state.votesD + state.votesR);
		const optimalNumRepsD = Math.round(votesRatio * (state.repsD + state.repsR));

		// difference between number of elected reps per party and number of reps per party
		// if reps were assigned based on popular vote alone.
		// negative values mean more Ds in office than popular vote ratio;
		// positive values mean more Rs.
		state.popularRepresentationDelta = optimalNumRepsD - state.repsD;

		// values between -1 (fully D) <> 1 (fully R)
		state.votesRatio = votesRatio * 2 - 1
		state.repsRatio = state.repsD / (state.repsD + state.repsR) * 2 - 1;
	});

	states = states.sort((a, b) => a.popularRepresentationDelta - b.popularRepresentationDelta);
		// .sort((a, b) => a.repsRatio - b.repsRatio);
	// console.log(states);
	// console.log(states.length);
}
