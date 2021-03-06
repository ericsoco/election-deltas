const MAJOR_PARTIES = {
	'R': true,
	'D': true
};

const PARTY_AFFILIATIONS = {
	'DFL': 'D',
	'DNL': 'D',
	'WF': 'D'
};

const VALID_STATES = {
	'AL': true,
	'AK': true,
	'AZ': true,
	'AR': true,
	'CA': true,
	'CO': true,
	'CT': true,
	'DE': true,
	'FL': true,
	'GA': true,
	'HI': true,
	'ID': true,
	'IL': true,
	'IN': true,
	'IA': true,
	'KS': true,
	'KY': true,
	'LA': true,
	'ME': true,
	'MD': true,
	'MA': true,
	'MI': true,
	'MN': true,
	'MS': true,
	'MO': true,
	'MT': true,
	'NE': true,
	'NV': true,
	'NH': true,
	'NJ': true,
	'NM': true,
	'NY': true,
	'NC': true,
	'ND': true,
	'OH': true,
	'OK': true,
	'OR': true,
	'PA': true,
	'RI': true,
	'SC': true,
	'SD': true,
	'TN': true,
	'TX': true,
	'UT': true,
	'VT': true,
	'VA': true,
	'WA': true,
	'WV': true,
	'WI': true,
	'WY': true
};

const INVALID_VOTES_STRINGS = [
	'n/a',
	'#'
];

module.exports = {
	MAJOR_PARTIES,
	PARTY_AFFILIATIONS,
	VALID_STATES,
	INVALID_VOTES_STRINGS
};
