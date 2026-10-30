import { config } from "dotenv";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { getDb } from "../src/lib/db";
import { geoPlaces } from "../src/lib/db/schema";
import { validRegion } from "../src/lib/core/locations";
config({ path: ".env.local" });
config();
async function main() {
  const file = process.argv[2];
  if (!file)
    throw new Error(
      "Usage: npx tsx scripts/ingest-geonames.ts path/to/US.txt (or CA.txt)",
    );
  const ca: Record<string, string> = {
    "01": "AB",
    "02": "BC",
    "03": "MB",
    "04": "NB",
    "05": "NL",
    "07": "NS",
    "08": "ON",
    "09": "PE",
    "10": "QC",
    "11": "SK",
    "12": "YT",
    "13": "NT",
    "14": "NU",
  };
  let batch: (typeof geoPlaces.$inferInsert)[] = [];
  let total = 0;
  for await (const line of createInterface({
    input: createReadStream(file),
    crlfDelay: Infinity,
  })) {
    const col = line.split("\t");
    if (col.length < 19 || col[6] !== "P" || !["US", "CA"].includes(col[8]))
      continue;
    const country = col[8] as "US" | "CA";
    const region = country === "CA" ? ca[col[10]] : col[10];
    if (!region || !validRegion(country, region)) continue;
    batch.push({
      id: col[0],
      country,
      region,
      city: col[1],
      attribution: "GeoNames, CC BY 4.0, https://www.geonames.org/",
    });
    if (batch.length === 500) {
      await getDb().insert(geoPlaces).values(batch).onConflictDoNothing();
      total += batch.length;
      batch = [];
    }
  }
  if (batch.length) {
    await getDb().insert(geoPlaces).values(batch).onConflictDoNothing();
    total += batch.length;
  }
  console.info(
    `Imported ${total} populated-place references; not business coverage.`,
  );
}
main()
  .then(() => process.exit(0))
  .catch(() => {
    console.error("Geography import failed");
    process.exit(1);
  });
