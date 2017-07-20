const assert = require('assert');
const fs = require('fs');

const parse = require('csv-parse');
const d3Collection = require('d3-collection'),
	 { nest } = d3Collection;
const jsonfile = require('jsonfile');
const transform = require('stream-transform');

const constants = require('./constants');
const {
	MAJOR_PARTIES,
	PARTY_AFFILIATIONS,
	VALID_STATES,
	INVALID_VOTES_STRINGS
} = constants;
const INPUT_PATH = './input';
const OUTPUT_PATH = './output';

const apportionmentsFiles = {
	'1990': `${INPUT_PATH}/apportionment1990.csv`,
	'2000': `${INPUT_PATH}/apportionment2000.csv`,
	'2010': `${INPUT_PATH}/apportionment2010.csv`
};

const YEARS = [
	'2014',
	'2012',
	'2010'
];

const houseYear = process.argv[2];
if (!YEARS.includes(houseYear)) {
	throw new Error(
`Year '${houseYear}' not available. Process data with the reducer script as follows:
\`$ npm parse-year -- YYYY\`
where \`YYYY\` is one of the following years: ${YEARS}`
	);
}

const houseVotesFile = `${INPUT_PATH}/houseVotes${houseYear}.csv`;
const houseResultsFile = `${INPUT_PATH}/houseResults${houseYear}.csv`;

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
				stateVotes.total = stateVotes.D + stateVotes.R + stateVotes.other;
				stateVotes.DPct = stateVotes.D / stateVotes.total;
				stateVotes.RPct = stateVotes.R / stateVotes.total;
				stateVotes.otherPct = stateVotes.other / stateVotes.total;
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
			const votesStr = votes.toLowerCase();
			const wasUnopposed = votesStr.includes('unopposed');
			const isInvalid = INVALID_VOTES_STRINGS.includes(votesStr);

			if (!wasUnopposed && !isInvalid) {
				// unexpected entries in 'GENERAL VOTES' column fall here.
				if (isNaN(+votes.replace(/,/gi, ''))) console.warn(`[WARN] votes isNaN: ${votes} [${state}]`);
			}
			if (isInvalid) return;

			const candidate = {
				state,
				stateName: row['STATE'],
				district,
				party,
				name: cleanCandidateName(row['CANDIDATE NAME']),
				votes: +votes.replace(/,/gi, ''),
				wasUnopposed,
				pct: wasUnopposed ? 0 : +(row['GENERAL %'].replace(/%/gi, '')) / 100,
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

function cleanCandidateName (name) {
	if (name.includes(' #')) return name.substr(0, -2);
	return name;
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
				// into to a single major party, if it exists
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
			if (!candidate.majorParty) {
				if (party.substr(0, 2) === 'D/') candidate.majorParty = 'D'
				else if (party.substr(0, 2) === 'R/') candidate.majorParty = 'R'
				else if (party.includes('(D)')) candidate.majorParty = 'D'
				else if (party.includes('(R)')) candidate.majorParty = 'R'
			}
			if (!candidate.majorParty && candidate.won) console.log(`${candidate.state}-${candidate.district}: ${candidate.party}`);
			return candidate;
		})
		.entries(candidates);

	// Then, flatten nested data into array of states
	// with only the winners represented in each.
	const states = nestedStates.map(state => {
		const reps = {
			D: [],
			R: [],
			other: [],
			unopposed: []
		};
		const stateVotes = {
			wastedD: 0,
			wastedR: 0,
			totalDR: 0
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

			// efficiency gap metric
			const districtVotes = calculateDistrictWastedVotes(district, winner);
			if (districtVotes) {
				stateVotes.wastedD += districtVotes.wastedD;
				stateVotes.wastedR += districtVotes.wastedR;
				stateVotes.totalDR += districtVotes.totalDR;
			}

			const {majorParty, wasUnopposed} = winner.value;
			if (majorParty) {
				reps[majorParty].push(winner);
			} else {
				reps.other.push(winner);
			}

			if (wasUnopposed) reps.unopposed.push(winner);
		});

		const efficiencyGapD = (stateVotes.wastedR - stateVotes.wastedD) / stateVotes.totalDR;

		return {
			id: state.key,
			name: state.values[0].values[0].value.stateName,
			numReps: {
				D: reps.D.length,
				R: reps.R.length,
				other: reps.other.length,
				unopposed: reps.unopposed.length
			},
			reps,
			efficiencyGapD,
			efficiencyGapSeatsD: efficiencyGapD * (reps.D.length + reps.R.length)
		};
	});

	validateStates(states, apportionmentsData);
	return states;
}

function calculateDistrictWastedVotes (district, winner) {
	// third-party winners cannot be used for efficiency gap metric
	if (!winner.value.majorParty) return null;

	let votesD, votesR;
	district.values.forEach(({value}) => {
		if (value.majorParty === 'D') votesD = value.votes;
		else if (value.majorParty === 'R') votesR = value.votes;
	});

	// if no vote count available for either party,
	// cannot include district in efficiency gap metric
	if (isNaN(votesD) || isNaN(votesR)) return null;

	const votesNeededToWin = Math.floor((votesD + votesR) / 2) + 1;
	return {
		wastedD: votesD > votesR ? votesD - votesNeededToWin : votesD,
		wastedR: votesR > votesD ? votesR - votesNeededToWin : votesR,
		totalDR: votesD + votesR
	};
}

function validateStates (states, apportionmentsData) {
	const apportionmentsYear = Math.floor(parseInt(houseYear) / 10) * 10;
	const apportionments = apportionmentsData[apportionmentsYear.toString()];

	if (!apportionments) {
		console.warn(`[WARN] Cannot validate states results for House year ${houseYear}; no apportionments data available for ${apportionmentsYear}.`);
		return;
	}

	states.forEach(state => {
		const stateNumReps = state.numReps.D + state.numReps.R + state.numReps.other;
		try {
			assert.equal(stateNumReps, apportionments[state.name].numHouseSeats, `Incorrect number of reps for state ${state.id}`);	
		} catch (error) {
			console.error(`${error.message}; expected:${error.expected}, actual:${error.actual}`);
		}
	});
}

function calculateMetrics ({candidates, states, houseVotesMap}) {
	statesMap = states.reduce((map, state) => {
		const {id, numReps} = state;
		const votes = houseVotesMap[id];
		if (!votes) {
			console.warn(`[WARN] No house votes data for ${id}`);
			return map;
		}

		const totalNumReps = numReps.D + numReps.R + numReps.other;
		const popularVoteNumRepsD = Math.round(votes.DPct * totalNumReps);
		const popularRepresentationDelta = numReps.D - popularVoteNumRepsD;

		map[id] = Object.assign({},
			state,
			{
				votes,
				popularRepresentationDelta
			}
		);
		return map;
	}, {});

	const processedStates = Object.keys(statesMap).map(id => statesMap[id]);
	const statesSortedByPopRepDelta = processedStates.concat()
		.sort((a, b) => a.popularRepresentationDelta - b.popularRepresentationDelta);
	const totalPopRepDelta = statesSortedByPopRepDelta
		.reduce((acc, state) => acc + state.popularRepresentationDelta, 0);
	// console.log(totalPopRepDelta);

	const statesSortedByEfficiencyGapSeats = processedStates.concat()
		.sort((a, b) => a.efficiencyGapSeatsD - b.efficiencyGapSeatsD);
	const totalEfficiencyGapSeatDelta = statesSortedByEfficiencyGapSeats
		.reduce((acc, state) => acc + state.efficiencyGapSeatsD, 0);
	// console.log({totalEfficiencyGapSeatDelta});

	writeMetrics({
		statesSortedByPopRepDelta,
		totalPopRepDelta,
		statesSortedByEfficiencyGapSeats,
		totalEfficiencyGapSeatDelta
	});
}

function writeMetrics ({statesSortedByEfficiencyGapSeats}) {
	const outFile = `${OUTPUT_PATH}/states-${houseYear}.json`;
	console.log(`Writing results to ${outFile}...`);
	jsonfile.writeFile(
		outFile,
		statesSortedByEfficiencyGapSeats,
		{ spaces: 2 },
		error => {
			if (error) console.error(`Could not write results to file: ${error}`);
		}
	);
}

function logResults (candidates, states) {
	console.log(candidates);
	console.log(states.map(state => `[${state.id}]:${state.numReps.D + state.numReps.R + state.numReps.other} -- (D${state.numReps.D} R${state.numReps.R} O${state.numReps.other})`));
}
