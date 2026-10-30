"""Explicit field mapping for an official Canada federal corporation CSV extract.
No registered street addresses/directors/personal details are retained.
Use --mapping with official column names after inspecting the downloaded release.
This does not fetch or claim a uniform Canadian/provincial registry API.
"""
import argparse
import csv
import json
import datetime

p = argparse.ArgumentParser()
p.add_argument("--file", required=True)
p.add_argument("--mapping", required=True, help="JSON file mapping canonical fields to release column names")
p.add_argument("--since", required=True)
p.add_argument("--until", required=True)
p.add_argument("--out", required=True)
p.add_argument("--limit", type=int, default=100)
a = p.parse_args()
since = datetime.date.fromisoformat(a.since)
until = datetime.date.fromisoformat(a.until)
if since > until or not 1 <= a.limit <= 500:
    p.error("Invalid date range/batch size")
with open(a.mapping, encoding="utf-8") as f:
    mapping = json.load(f)
required = ["source_id", "name", "region", "city", "registration_date"]
if any(key not in mapping for key in required):
    p.error("Mapping requires " + ", ".join(required))
count = 0
with open(a.file, encoding="utf-8-sig", newline="") as source, open(a.out, "w", encoding="utf-8") as out:
    for raw in csv.DictReader(source):
        if any(mapping[key] not in raw for key in required):
            p.error("Mapping does not match this release's columns")
        row = {key: raw[col].strip() for key, col in mapping.items()}
        date = datetime.date.fromisoformat(row["registration_date"][:10])
        if not since <= date <= until:
            continue
        row.update(country="CA", registration_date=date.isoformat(), niche=row.get("niche", "registry"), operating_status="unknown")
        # Registered/active status is not an operational business activity signal.
        out.write(json.dumps(row, ensure_ascii=False)+"\n")
        count += 1
        if count >= a.limit:
            break
print(f"Normalized {count} federal filings; independent activity/email enrichment still required.")
