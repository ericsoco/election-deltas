const fs = require('fs');
const parse = require('csv-parse');
const transform = require('stream-transform');

const VALID_PARTIES = {
	'R': true,
	'D': true
};

const dataFile = process.argv[2],
	candidates = [],
	candidateMap = {};

const parser = parse({
	columns: true,
	delimiter: ',',
	rowDelimiter: '\r\n',
	comment: '~'
});

const transformer = transform(row => {
	const party = row['PARTY'].trim(),
		votes = row['GENERAL VOTES '];

	if (votes && VALID_PARTIES[party]) {
		const state = row['STATE ABBREVIATION'],
			district = row['D'].substr(0, 2);

		const candidate = {
			state,
			district,
			party,
			name: row['CANDIDATE NAME'],
			votes: +votes.replace(',', ''),
			pct: +(row['GENERAL %'].replace('%')) / 100,
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
		calculateMetrics();
	});

function calculateMetrics () {
	let states = candidates.reduce((acc, candidate) => {
		let state = acc[candidate.state];
		if (!state) {
			state = {
				name: candidate.state,
				repsD: 0,
				repsR: 0,
				repsRatio: -1,
				votesD: 0,
				votesR: 0,
				votesRatio: -1,
				popularRepresentationDelta: null
			};
			acc[candidate.state] = state;
		}

		if (candidate.won) {
			state[`reps${candidate.party}`]++;
			state.repsRatio = state.repsD / (state.repsD + state.repsR);
		}

		state[`votes${candidate.party}`] += candidate.votes;
		state.votesRatio = state.votesD / (state.votesD + state.votesR);

		if (state.repsRatio > -1) {
			state.popularRepresentationDelta = state.repsRatio - state.votesRatio;
		}

		return acc;
	}, {});

	states = Object.keys(states)
		.map(k => states[k])
		.sort((a, b) => a.popularRepresentationDelta - b.popularRepresentationDelta);
	console.log(states);
	// console.log(states.length);
}