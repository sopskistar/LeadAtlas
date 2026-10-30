"""Bounded public Parquet extraction. Run on a worker/operator machine, never Vercel.
Raw selected records stay in the operator's object-storage/staging location.
No private addresses or other individual-level fields are selected.
"""
import argparse
import datetime
import json
import os
import re
import threading
import tempfile
import duckdb

parser = argparse.ArgumentParser()
parser.add_argument("--release", default="2026-10-21.0")
parser.add_argument("--bbox", required=True, help="west,south,east,north; <=1 square degree")
parser.add_argument("--country", choices=["US", "CA"], required=True)
parser.add_argument("--region", required=True)
parser.add_argument("--city", required=True)
parser.add_argument("--niche", default="plumber")
parser.add_argument("--limit", type=int, default=25)
parser.add_argument("--after-id", default="")
parser.add_argument("--out", required=True)
parser.add_argument("--timeout",type=int,default=180)
args = parser.parse_args()
niche_aliases={"plumber":"plumb","plumbers":"plumb","plumbing":"plumb","electrician":"electric","electricians":"electric","roofer":"roof","roofers":"roof","cleaner":"clean","cleaners":"clean"}
niche_query=niche_aliases.get(args.niche.lower().strip(),args.niche.lower().strip().replace(" ","_"))
if not re.fullmatch(r"\d{4}-\d{2}-\d{2}\.\d+", args.release):
    parser.error("Invalid release")
w, s, e, n = map(float, args.bbox.split(","))
if not (-180 <= w < e <= 180 and -90 <= s < n <= 90 and (e-w)*(n-s) <= 1 and 1 <= args.limit <= 500):
    parser.error("Invalid bounds or batch size")
os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
con = duckdb.connect()
con.execute("SET memory_limit='512MB'")
con.execute("SET threads=2")
con.execute("SET extension_directory = ?", [os.path.join(tempfile.gettempdir(), "leadatlas-duckdb-extensions")])
con.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2'")
con.execute("SET http_timeout=15; SET http_retries=1")
path = f"s3://overturemaps-us-west-2/release/{args.release}/theme=places/type=place/*"
query = """SELECT id, names.primary AS name, operating_status,
 to_json(websites), to_json(socials), to_json(emails), to_json(sources), to_json(addresses), taxonomy.primary
 FROM read_parquet(?, hive_partitioning=true)
 WHERE bbox.xmin BETWEEN ? AND ? AND bbox.ymin BETWEEN ? AND ?
 AND lower(taxonomy.primary) LIKE ? AND id > ?
 AND (operating_status IS NULL OR operating_status != 'permanently_closed')
 ORDER BY id LIMIT ?"""
timer=threading.Timer(max(10,min(args.timeout,600)),con.interrupt)
timer.daemon=True
timer.start()
try:
    rows = con.execute(query, [path, w, e, s, n, "%"+niche_query+"%", args.after_id, args.limit]).fetchall()
finally:
    timer.cancel()
allowed = {"CDLA-Permissive-2.0", "Apache-2.0", "CC0-1.0"}
count = 0
excluded = {"unapproved_license":0,"geography_or_name":0}
observed_licenses=set()
observed_locations=set()
last_id = args.after_id
with open(args.out, "w", encoding="utf-8") as output:
    for rid, name, status, websites, socials, emails, sources, addresses, category in rows:
        last_id = rid
        source_list = json.loads(sources or "[]")
        licenses = {item.get("license") for item in source_list}
        observed_licenses.update(str(item) for item in licenses)
        observed_locations.update((str(item.get("country")),str(item.get("region")),str(item.get("locality"))) for item in json.loads(addresses or "[]"))
        # Fail closed for missing or mixed/unsupported per-record source licences.
        if not licenses or not licenses.issubset(allowed):
            excluded["unapproved_license"]+=1
            continue
        address = next((a for a in json.loads(addresses or "[]") if a.get("country") == args.country and a.get("locality", "").casefold() == args.city.casefold() and a.get("region", "").removeprefix(args.country+"-") == args.region), None)
        if not address or not name:
            excluded["geography_or_name"]+=1
            continue
        updates = [item.get("update_time") for item in source_list if item.get("update_time")]
        record = dict(source_id=rid, name=name, country=args.country, region=args.region, city=address["locality"], niche=category,
                      websites="|".join(json.loads(websites or "[]")), socials="|".join(json.loads(socials or "[]")), emails="|".join(json.loads(emails or "[]")),
                      email_source_url=f"https://explore.overturemaps.org/#id={rid}", operating_status=status or "unknown",
                      source_updated_at=max(updates) if updates else "", record_license=sorted(licenses)[0])
        output.write(json.dumps(record, ensure_ascii=False)+"\n")
        count += 1
manifest = dict(file=args.out, format="jsonl", source="overture", sourceUrl="https://docs.overturemaps.org/guides/places/",
                license="Per-record licensing; retain all source notices", attribution=f"Overture Maps Foundation, release {args.release}; see https://docs.overturemaps.org/attribution/ for upstream notices",
                permissionConfirmed=False, extractedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(), nextCursor=last_id, count=count,candidatesRead=len(rows),excluded=excluded)
with open(args.out+".manifest.json", "w", encoding="utf-8") as output:
    json.dump(manifest, output, indent=2)
print(json.dumps({"candidatesRead":len(rows),"accepted":count,"excluded":excluded,"observedLicenses":sorted(observed_licenses),"observedLocations":sorted(observed_locations)}))
print("Review upstream attribution and set permissionConfirmed in manifest before import. Zero accepted rows is not connected lead coverage.")
