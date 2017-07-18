## TODO

NEXT:
- [X] remove unopposed races / seats altogether.
	could try using linear regression from previous/future elections
	to approximate vote counts if not unopposed,
	but due to redistricting there's really no good way to approximate.
	-- they're effectively already removed, since there is no vote count for those races,
		but they still must factor into the total & per-party rep count.
- [ ] calculate efficiency gap, too
	need:
	- num votes D/R/total per race
	- winner
	- winner must be D or R (have to omit third-party wins)
	- [ ] verify calculations
		ran a first pass but too tired to check it is correct...

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
