# election-deltas

Vote data from [FEC](http://www.fec.gov/pubrec/electionresults.shtml).
Apportionment data from [US Census](https://www.census.gov/population/apportionment/data/1990_apportionment_results.html).



## processing the data

```
cd data
node reducer.js YYYY
```

where `YYYY` is the year suffix on the data file to process.

e.g. `node reducer.js 2014` will process results for 2014 given there are two vote data files:

- houseResults2014.csv
- houseVotes2014.csv

These CSV files are saved from the Excel sheets [posted bi-annually by the FEC](http://www.fec.gov/pubrec/electionresults.shtml).

### methodology

TODO

#### "popular representation delta"

TODO



## running the visualization

TODO
