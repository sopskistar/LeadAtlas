# Real Overture regional research samples — NOT verified leads

These nine records were actually extracted from the public Overture Places `2026-10-21.0` Parquet release on 30 October 2026 with `scripts/ingest_overture.py` and DuckDB 1.4.3. They are licensed discovery candidates, not demo/fictional businesses and not qualified or independently verified contacts.

- New York: 4 accepted records from a 5-candidate bounded query. One Bronx locality was excluded rather than relabelled New York.
- Toronto: 5 accepted records from a 5-candidate bounded query.
- Bounds, release, extraction time, source cursor, rights-review flag and counts are preserved in manifests. Each row retains the GERS source ID, actual upstream timestamp and record license.
- `plumber` is mapped to the linguistic category root `plumb`, because the current records use `plumbing`. This is a category-filter alias, not a business identity assertion.
- Upstream `open` is not independent trading evidence. Toronto rows with absent operating status stay `unknown`. Emails are copied only from licensed source fields; none were verified against a website or a mailbox provider, and some rows have no email.
- No records were inserted into Neon: no database credentials were available. The sample manifests deliberately retain `permissionConfirmed: false` for the operator’s own review before import.

## Sources, licences and modifications

Source: [Overture Places](https://docs.overturemaps.org/guides/places/), public S3 path `s3://overturemaps-us-west-2/release/2026-10-21.0/theme=places/type=place/*`.

Attribution: Overture Maps Foundation and upstream providers as described in the [official attribution registry](https://docs.overturemaps.org/attribution/). Record-level CDLA-Permissive-2.0 applies to the marked rows. The Toronto record with source ID `11f72f54-3bab-4f44-a22d-06b7a784593f` is marked Apache-2.0 and includes Foursquare-derived data. Preserve the accompanying licence texts and full Foursquare notice under `licenses/` when sharing the data.

Foursquare attribution: Copyright 2024 Foursquare Labs, Inc. All rights reserved, per Overture’s notice. The current full Foursquare notice is also preserved as retrieved from its official source. Upstream Foursquare data was transformed into Overture’s schema. LeadAtlas further filtered the release by geographic bounds and taxonomy, removed closed or mismatched-locality candidates, selected a limited set of business fields, classified website/social references and normalized rows to JSONL. No private street addresses or directors were retained.

Review current data rights and freshness yourself before ingestion or contact. The live samples are never silently seeded into a production database, never displayed as example verified results and never eligible for qualified export solely because this file exists.
