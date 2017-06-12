const fs = require('fs');
const assert = require('assert');
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

const apportionmentsFiles = {
	'1990': 'apportionment1990.csv',
	'2000': 'apportionment2000.csv',
	'2010': 'apportionment2010.csv'
};

const houseYear = process.argv[2];
const houseVotesFile = `houseVotes${houseYear}.csv`;
const houseResultsFile = `houseResults${houseYear}.csv`;

preloadData({apportionmentsFiles, houseVotesFile})
.then(preloadedData => processHouseResults(houseResultsFile, preloadedData))
.catch(error => {
	throw error;
});

function preloadData (preloadFiles) {
	const {apportionmentsFiles, houseVotesFile} = preloadFiles;
	return Promise.all([
		loadApportionmentsData(apportionmentsFiles),
		loadHouseVotes(houseVotesFile)
	])
	.then(results => results.reduce((acc, obj) => {
		let k = Object.keys(obj)[0];
		acc[k] = obj[k];
		return acc;
	}, {}))
}

function loadApportionmentsData (files) {
	return new Promise((resolve, reject) => {
		let preloadCount = 0;
		const numPreloads = Object.keys(apportionmentsFiles).length;
		const apportionmentsData = {};

		Object.keys(apportionmentsFiles).forEach(year => {
			const file = apportionmentsFiles[year];
			apportionmentsData[year] = [];
			const csvParser = parse({
				columns: true,
				delimiter: ',',
				rowDelimiter: '\n',
				comment: '~'
			});
			fs.createReadStream(file)
				.pipe(csvParser)
				.pipe(transform(row => {
					apportionmentsData[year].push(row);
				}))
				.on('finish', () => {
					if (++preloadCount >= numPreloads) {
						for (let year in apportionmentsData) {
							apportionmentsData[year] = apportionmentsData[year].reduce((acc, row) => {
								acc[row.state] = {
									population: +row.population,
									numHouseSeats: +row['house_seats']
								}
								return acc;
							}, {});
						}
						resolve({apportionmentsData});
					}
				});
		});
	});
}

function loadHouseVotes (file) {
	return new Promise((resolve, reject) => {
		const houseVotesMap = {};
		const csvParser = parse({
			columns: true,
			delimiter: ',',
			rowDelimiter: '\r\n',
			comment: '~'
		});
		const transformer = transform(row => {
			const state = row['State'];
			if (VALID_STATES[state]) {
				const stateVotes = {
					D: +(row['General_Democratic'].replace(/,/gi, '')) || 0,
					R: +(row['General_Republican'].replace(/,/gi, '')) || 0,
					other: +(row['General_Other'].replace(/,/gi, '')) || 0
				};
				const totalVotes = stateVotes.D + stateVotes.R + stateVotes.other;
				stateVotes.DPct = stateVotes.D / totalVotes;
				stateVotes.RPct = stateVotes.R / totalVotes;
				stateVotes.otherPct = stateVotes.other / totalVotes;
				houseVotesMap[row['State']] = stateVotes;
			}
		});
		fs.createReadStream(file)
			.pipe(csvParser)
			.pipe(transformer)
			.on('finish', () => {
				resolve({houseVotesMap});
			});
	});
}

function processHouseResults(dataFile, preloadedData) {
	const csvParser = parse({
		columns: true,
		delimiter: ',',
		rowDelimiter: '\r\n',
		comment: '~'
	});
	const candidates = [],
		candidateMap = {};

	const transformer = transform(row => {
		const party = row['PARTY'].trim(),
			votes = row['GENERAL VOTES '],
			state = row['STATE ABBREVIATION'];

		if (votes && VALID_STATES[state]) {
			const district = row['D'].substr(0, 2);

			// TODO: vv fix this case vv
			if (isNaN(+votes.replace(/,/gi, ''))) console.warn(`[WARN] votes isNaN: ${votes}[${state}]`);

			const candidate = {
				state,
				stateName: row['STATE'],
				district,
				party,
				name: row['CANDIDATE NAME'],
				votes: +votes.replace(/,/gi, ''),
				pct: +(row['GENERAL %'].replace(/%/gi, '')) / 100,
				incumbent: !!row['(I)'],
				won: !!row['GE WINNER INDICATOR']
			};
			candidates.push(candidate);
			candidateMap[`${state}-${district}-${party}`] = candidate;
		}
	});

	fs.createReadStream(dataFile)
		.pipe(csvParser)
		.pipe(transformer)
		.on('finish', () => {
			calculateMetrics({
				candidates,
				states: cleanAndReduce(candidates, preloadedData),
				houseVotesMap: preloadedData.houseVotesMap
			});
		});
}

function cleanAndReduce (candidates, {apportionmentsData, houseVotesMap}) {
	// First, nest all candidates by state and district,
	// and clean / normalize as necessary
	let nestedStates = nest()
		.key(c => c.state)
		.key(c => c.district)
		.rollup(districtList => {
			// vv vv vv
			// TODO: ensure at least one winner per district (HI D-01, VA-??)
			// ^^ ^^ ^^
			// only return numbered districts
			// (non-numeric values may appear in district column on metadata rows)
			console.log(">>>> ROLLUP!");
			console.log(">>>> WHY IS THIS NOT CALLED??? only one rollup per nest()?");
			debugger;
			return districtList.filter(district => !isNaN(parseInt(district.key)));
		})
		.key(c => c.name)
		.rollup(nameList => {
			// only return one entry per name
			let candidate;
			if (nameList.length === 1) {
				candidate = nameList[0];
			} else {
				// aggregate all votes for a candidate across parties
				// down to a single major party, if it exists
				candidate = nameList.find(c => {
					MAJOR_PARTIES[c.party] ||
					MAJOR_PARTIES[PARTY_AFFILIATIONS[c.party]]
				});
				if (!candidate) {
					// if no major party affiliation, use the entry
					// with the most votes to determine party
					candidate = nameList.sort((a, b) => b.votes - a.votes)[0];
				}
				// keep track of all non-major parties for this candidate
				candidate.otherParties = nameList.reduce((acc, c) => c !== candidate ? acc.concat(c.party) : acc, []);
				// aggregate all votes across parties for this candidate,
				// but do not double-count votes in case two entries for same name + party
				candidate.votes += nameList.reduce((acc, c) => c.party !== candidate.party ? acc + c.votes : acc, 0);
			}
			// map all candidates to a major party if possible
			let {party} = candidate;
			candidate.majorParty = MAJOR_PARTIES[party] ? party : PARTY_AFFILIATIONS[party];
			return candidate;
		})
		.entries(candidates);

	// Then, flatten nested data into array of states
	// with only the winners represented in each.
	const states = nestedStates.map(state => {
		const reps = {
			D: [],
			R: [],
			other: []
		};

		state.values.forEach(district => {
			// only return numbered districts
			// (non-numeric values may appear in district column on metadata rows)
			// TODO: tried to run this as a rollup above but didn't work...???
			if (isNaN(parseInt(district.key))) return;

			const winner = district.values.find(candidate => candidate.value.won);
			if (!winner) {
				console.warn(`[WARN] No winner found in ${state.key}-${district.key}`);
				return;
			}

			const {majorParty} = winner.value;
			if (majorParty) {
				reps[majorParty].push(winner);
			} else {
				reps.other.push(winner);
			}
		});

		return {
			name: state.key,
			longname: state.values[0].values[0].value.stateName,
			numRepsD: reps.D.length,
			numRepsR: reps.R.length,
			numRepsOther: reps.other.length,
			reps
		};
	});

	validateStates(states, apportionmentsData);
	return states;
}

function validateStates (states, apportionmentsData) {
	const apportionmentsYear = Math.floor(parseInt(houseYear) / 10) * 10;
	const apportionments = apportionmentsData[apportionmentsYear.toString()];

	if (!apportionments) {
		console.warn(`[WARN] Cannot validate states results for House year ${houseYear}; no apportionments data available for ${apportionmentsYear}.`);
		return;
	}

	states.forEach(state => {
		const stateNumReps = state.numRepsD + state.numRepsR + state.numRepsOther;
		try {
			assert.equal(stateNumReps, apportionments[state.longname].numHouseSeats, `Incorrect number of reps for state ${state.name}`);	
		} catch (error) {
			console.error(`${error.message}; expected:${error.expected}, actual:${error.actual}`);
		}
	});
}

function calculateMetrics (data) {

	const {candidates, states, houseVotesMap} = data;
	console.log(data);

	//
	// TODO NEXT:
	// calc optimalNumRepsD and popularRepresentationDelta from here
	//

	/*
	// reduce list of individual candidates into list of stats per state
	const totalReps = {};
	let statesMap = candidates.reduce((acc, candidate) => {
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
	*/
}

function logResults (candidates, states) {
	console.log(candidates);
	console.log(states.map(state => `[${state.name}]:${state.numRepsD + state.numRepsR + state.numRepsOther} -- (D${state.numRepsD} R${state.numRepsR} O${state.numRepsOther})`));
}