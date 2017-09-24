## TODO

NEXT:
- [ ] clean + process data for 2002-2012
	- [X] pull houseVotesYYYY.csv files
	- [X] pull houseResultsYYYY.csv files
	- [ ] 2010 and before is missing GE WINNER INDICATOR
		(did i already write code for this, for same case w/
		 HI District 01 in 2014? see notes.txt)
	- [ ] document cleaning process in README.md
	- [ ] parse remaining files
		- [ ] filter only to rows with valid FEC ID# ?
			because 2014 does not list aggregated votes per district,
			but other years (2012) do...
		- [ ] parse incumbent status column as well
	- [ ] fix parsing issues per year
- [ ] document methodology before it's gone from your head completely
- [X] remove unopposed races / seats altogether.
	could try using linear regression from previous/future elections
	to approximate vote counts if not unopposed,
	but due to redistricting there's really no good way to approximate.
	-- they're effectively already removed, since there is no vote count for those races,
		but they still must factor into the total & per-party rep count.
	"For districts without both a Democrat and Republican running in the general election, we estimated
	the vote share both parties would have received in a contested two-party election based on the prior
	election’s House results, the most recent district-level Presidential results using totals calculated and
	compiled by Daily Kos Elections for both 2012 and 2016,19 a district’s Cook Partisan Voter Index, and
	the winning candidate’s incumbency status." -- Brennan Center For Justice
	http://www.politico.com/f/?id=0000015c-11a2-d46a-a3ff-9da240e10002, p16

- [ ] calculate efficiency gap, too
	need:
	- num votes D/R/total per race
	- winner
	- winner must be D or R (have to omit third-party wins)
	- [ ] verify calculations
		- [ ] against Appendix A here: http://www.politico.com/f/?id=0000015c-11a2-d46a-a3ff-9da240e10002
			(note that their methodolgy attempts to limit impact of high-turnout districts,
			so numbers will likely be slightly different)
			--> numbers are similar but still substantially different.
				need to loop back on this...
	- [ ] becomes problematic for states with < 6 seats, should throw those out
	- [ ] note (in visualization?) those above 2-seat threshold

- [X] write to files instead of just logging
- [ ] a few TODOs in the code...
- [ ] handle special elections:
	detect them while parsing and mark them as anomalies,
	just like with unopposed elections.
	then decide what to do with them on the visualization side.
	e.g. VA-07 in 2014
- [ ] calculate based on statewide per-party votes (pres/senate/gov)
	as different metric than summing house votes?
	note: pres vote % is available in 2012 sheet, in Appendix A, back to 1990s.
	note: pres+senate votes (combined) available in each sheet, ~4th tab
- [ ] process all data into new file/s
- [ ] map it!
- [ ] 50-bar chart: each state, left-ro-right, sorted by poprepdelta
	- [ ] combine with urban-rural breakdown
		https://docs.google.com/spreadsheets/d/1tglaCjHFaS64lMA_Z4czGqVknmySOPM-p66V5PeH6Rc/edit#gid=728308973
		(from: http://www.icip.iastate.edu/tables/population/urban-pct-states)
	- [ ] could also display D/R seats as e.g. stacked bar, with optimal distribution of seats marked on stacked bar
		e.g. NC: D-D-D-R-R-R|R-R-R-R-R-R-R
			 PA: D-D-D-D-D-R-R-R|R-R-R-R-R-R-R-R-R-R
			 NY: D-D-D-D-D-D-D-D-D-D-D-D-D|D-D-D-D-D-R-R-R-R-R-R-R-R-R
		color poprepdelta area more brightly
		align all bars on horizontal axis between R & D, i.e. all R above all D below
		also, highlight unopposed races....no good way to factor these into poprepdelta but they're significant.
		ensure each item represents a district, not a candidate, since candidates (and parties) can change
		within a single term (via special elections).
- [ ] other non-geospatial forms...?
- [ ] question for levi / Open Redistricting: why the massive dem poprepdeltas in NY & CA?
	- democratic gerrymandering?
	- urban distribution?
	- lower dem turnout in some areas (urban)?
	- something else?

----

- [X] verify that all house seats are accounted for for each year's election;
	not all seats may have been up for election. (?)
- [X] handle elections with unopposed candidates...how?
- [X] is it useful to have the total vote counts per state?
	https://transition.fec.gov/pubrec/fe2014/tables2014.pdf
	p9 has house general votes per state per party...
- [X] use percentage values instead of doing my own math?
	since they're calculated against total number of votes...
- [X] properly account for third-parties
	see constants:PARTY_AFFILIATIONS
- [X] combine votes for candidates running across parties
	(look for candidates with same name who also won)
- [X] use percentages instead of summing vote counts,
	if avail across all elections (might not be!)
	(could also use "District Votes marker in [TOTAL VOTES] column")
- [X] check back through older election results to see how much i can parse programmatically
	--> back to about 2000
- [X] verify state totals against apportionment data
	- [X] preload
	- [X] compare
