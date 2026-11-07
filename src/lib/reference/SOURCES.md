# Search references

These files contain geographic place names and industry classifications, never business prospects. Retrieved 2026-11-04. Suggestions do not imply source coverage or qualification.

- **GeoNames cities500**: https://download.geonames.org/export/dump/cities500.zip. CC BY 4.0, https://www.geonames.org/. The official format/scope is documented at https://download.geonames.org/export/dump/readme.txt. Populated places above 500 residents plus administrative seats, filtered to the existing US 50 states/DC and all Canadian provinces/territories. 24,785 distinct names in 64 region partitions. This is not every hamlet; arbitrary custom cities remain supported. Original archive SHA-256 `7bea4c09f6df77df9b5bbccdeafa3d9e38873b46037e0385cc0f421a34d426e1`.
- **US Census 2022 NAICS structure**: https://www.census.gov/naics/2022NAICS/2022_NAICS_Structure.xlsx, linked from https://www.census.gov/naics/. 1,012 six-digit classifications. Canonical IDs include the version. The 2027 revision is proposed, so this release deliberately retains the published 2022 classification. Original workbook SHA-256 `217c9e0d4d74e7517bc288f5f308b73aa0de5ee787976a6dd222412be28ada22`.

Reproduce with Python's standard library:

```sh
curl -fL https://download.geonames.org/export/dump/cities500.zip -o /tmp/leadatlas-cities500.zip
curl -fL https://www.census.gov/naics/2022NAICS/2022_NAICS_Structure.xlsx -o /tmp/leadatlas-naics.xlsx
python3 scripts/build-reference-data.py /tmp/leadatlas-cities500.zip /tmp/leadatlas-naics.xlsx
```

Review changes and refresh provenance/hashes when updating. Customer-facing niche aliases are a small curated enrichment of the complete machine-generated taxonomy, in `lookups.ts`; they do not claim to be Census terminology. Narrow aliases take priority over a shared broad NAICS code during business matching. Custom niches have no canonical ID.

The server lazily creates one normalized, sorted city index per requested region, performs a binary prefix lookup, and returns 30 names with an offset cursor. The browser never imports these JSON files. The existing `geo_places` table and full-country GeoNames importer remain intact for operator use; the bundled reference provides consistent public suggestions without a configured account database. Both use the same Canadian admin-code mapping and existing region definitions.
