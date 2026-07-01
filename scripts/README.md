this script is intended to extract data from only '.../statistics_canada/census_profiles/statscan_2013_fednum_profiles_census_2011_nhs.csv'

Usage:
```bash
	python extract_census.py input.csv                     # defaults placing output file in the same directory as the input file, if an output file is not indicated
	python extract_census.py input.csv --out results.json
```


for whatever reason, the structures of the file from each year varies...

The CRMP specifications also wanted the following information:

- Electoral quotient deviation
- Indigenous community prescence
- Official language mnority percentage

However, I could not find a reliable source to extract this data in a way to match the pmtiles. So I guess this is what we work with for now.

With this json file, we can now refer to each item in the list by the 'fed_num' that will match the pmtile 'fed_num' districts, and show a short summary based on the selected district.
