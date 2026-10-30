# Regional import contract

Ingest only data you are entitled to persist and export. Genuine bounded Overture research samples are supplied under `samples/overture-2026-10-21.0/`: 4 New York and 5 Toronto records, with licences, notices and manifests. They were actually extracted from public S3, remain unverified and are not production database coverage. Synthetic fixtures live exclusively under tests. Neon ingestion still requires credentials.

## Normalized CSV/JSONL

Required fields: `source_id,name,country,region,city,niche`. Country is `US` or `CA`, region is the two-letter state/province code. Optional fields:

| Field                           | Contract                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `websites`, `socials`, `emails` | Pipe-separated values; website/social URLs are classified separately                                     |
| `email_source_url`              | Required when emails exist; exact public listing or business-contact evidence, never an inferred address |
| `operating_status`              | open / permanently_closed / temporarily_closed / unknown; default unknown                                |
| `source_updated_at`             | ISO datetime from actual upstream metadata; not fabricated from import time                              |
| `registration_date`             | YYYY-MM-DD; required for Canada federal imports                                                          |
| `record_license`                | Required for Overture; approved identifier from the whitelist                                            |
| `fixture`                       | JSONL boolean true for test/demo data; such records cannot export as genuine                             |

No imported `valid`, score or verifier response is trusted. First-party website contact evidence is refreshed by the worker; source-only emails retain their real evidence age. Every batch requires source URL, license/agreement reference, attribution and permission confirmation. Current limits: 500 rows and 2 MB by default, enforced before persistence. Record rights and citation travel with the data.

For CLI imports create a JSON manifest containing `file`, `format` (`csv`/`jsonl`), `source` (`imports`/`overture`/`canada`), `sourceUrl`, `license`, `attribution`, `permissionConfirmed: true`. Set permission only after reviewing actual upstream terms. Then:

```powershell
npm run ingest -- --owner YOUR_ADMIN_USER_ID --manifest data/batch.manifest.json
```

The admin must exist in the database and ADMIN_USER_IDS. Batch hashes prevent repeated import; business upserts deduplicate. Unrecognized fields are discarded. Do not load raw Parquet into PostgreSQL.

## Bounded Overture extraction (worker/operator host)

Install Python and DuckDB in a virtual environment. Pin the release and verify the live schema/distribution before running. Current documented release in the specification: `2026-10-21.0`. The script uses unauthenticated public S3 reads; no AWS key is needed.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-ingest.txt
python scripts/ingest_overture.py --release 2026-10-21.0 --bbox=-74.03,40.70,-73.90,40.82 --country US --region NY --city "New York" --niche plumber --limit 25 --out data/nyc-plumbers.jsonl
python scripts/ingest_overture.py --release 2026-10-21.0 --bbox=-79.47,43.62,-79.30,43.76 --country CA --region ON --city Toronto --niche plumber --limit 25 --out data/toronto-plumbers.jsonl
```

Linux activation: `source .venv/bin/activate`. The live S3 path was exercised with DuckDB 1.4.3 for both sample cities. DuckDB 2.0.0 crashed on this nested Parquet query and is not the pinned extraction runtime. Region/city comparisons are strict, so missing locality metadata is skipped instead of relabelled. Closed rows are filtered before import; unknown/open rows still require separate activity verification. HTTP range reads and column projection keep ingestion bounded; cloud request/scan costs can still occur.

Inspect the generated `.manifest.json`, actual source licenses and required notices, adjust its attribution reference as needed, then set `permissionConfirmed: true`. Import each manifest using the command above. `--after-id CURSOR` resumes after the last source ID in the manifest. Keep selected raw outputs/manifests in encrypted, access-controlled S3/R2/Blob/object storage managed by the operator; this initial repository does not provision an object-storage service or upload raw files automatically. Only normalized permitted records enter Neon.

This extractor fails closed for unknown/mixed unsupported upstream licenses. For multiple permitted upstream licenses, retain all associated notices as part of the batch audit before granting export. Do not assume Overture existence confidence proves current trading or email quality.

## Canada federal records

Download the actual [Federal Corporations open dataset](https://open.canada.ca/data/en/dataset/0032ce54-c5dd-4b66-99a0-320a7b5e99f2) via [official data services](https://ised-isde.canada.ca/site/corporations-canada/en/data-services). Inspect its current format and columns. This implementation supports official CSV extracts through an explicit mapping; it does not invent a fixed API URL/schema or parse every historical bulk format.

Create a mapping JSON whose keys `source_id,name,region,city,registration_date` map to the actual column names in your release; optionally map niche or publicly licensed business contact fields. Dates must be ISO. Normalize a bounded date range:

```powershell
python scripts/normalize_canada.py --file data/official-federal.csv --mapping data/canada-mapping.json --since 2026-10-01 --until 2026-10-30 --limit 100 --out data/canada-recent.jsonl
```

Import through the admin UI with source **Corporations Canada**, official download/catalog URL, exact license and attribution. Legal registration activity remains unknown as to trading. Source-data updates are not fabricated; company contact emails need separate licensed evidence and verification. The Canada adapter queries imported records by incorporation date/city/region. No 50-state live feed or provincial feed is represented as connected.

## Location reference data

Download and extract `US.zip` and `CA.zip` from [GeoNames](https://download.geonames.org/export/dump/). This CC BY reference data supplies city suggestions independently of lead coverage:

```powershell
npx tsx scripts/ingest-geonames.ts data/US.txt
npx tsx scripts/ingest-geonames.ts data/CA.txt
```

The UI accepts city text even if reference files are absent. All state/province codes are already supplied; no claim of worldwide city/business ingestion is made.
