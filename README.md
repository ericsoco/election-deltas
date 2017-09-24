# election-deltas

Vote data from [FEC](http://www.fec.gov/pubrec/electionresults.shtml).
Apportionment data from [US Census](https://www.census.gov/population/apportionment/data/1990_apportionment_results.html).



## processing the data

```
npm run parse-year -- YYYY
```

where `YYYY` is the year suffix on the data file to process.

e.g. `node reducer.js 2014` will process results for 2014 given there are two vote data files:

- `houseResults2014.csv`
- `houseVotes2014.csv`

These CSV files are exported from the Excel sheets [posted bi-annually by the FEC](http://www.fec.gov/pubrec/electionresults.shtml), and manually cleaned.

### cleaning the data

The following steps were taken to aid processing:
- column names standardized across all `houseVotesYYYY.csv` and `houseResultsYYYY.csv` files
- `houseResultsYYYY.csv` for 2010 and earlier are missing `GE WINNER INDICATOR`, so this is calculated during processing


### methodology

TODO

#### "popular representation delta"

TODO



## running the visualization

TODO
