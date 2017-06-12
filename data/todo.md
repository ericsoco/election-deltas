## TODO

- verify that all house seats are accounted for for each year's election;
	not all seats may have been up for election. (?)
- handle elections with unopposed candidates...how?
- is it useful to have the total vote counts per state?
	https://transition.fec.gov/pubrec/fe2014/tables2014.pdf
	p9 has house general votes per state per party...
- consider how to handle third-party candidates
- use percentage values instead of doing my own math?
	since they're calculated against total number of votes...

- [X] properly account for third-parties
	see constants:PARTY_AFFILIATIONS
- [X] combine votes for candidates running across parties
	(look for candidates with same name who also won)
- [ ] use percentages instead of summing vote counts,
	if avail across all elections (might not be!)
	(could also use "District Votes marker in [TOTAL VOTES] column")
- [X] check back through older election results to see how much i can parse programmatically
	--> back to about 2000
- [X] verify state totals against apportionment data
	- [X] preload
	- [X] compare
