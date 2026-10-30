import { assess, contactQualified } from "./quality";
import type { BusinessRecord, Product } from "./types";
export function csvCell(value: string) {
  const safe =
    /^[\s\u0000-\u001f]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value)
      ? "'" + value
      : value;
  return /[",\r\n]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
}
export function qualifiedCsv(
  records: BusinessRecord[],
  product: Product,
  now = new Date(),
) {
  const rows: string[] = ["Business Name,Email"];
  const seen = new Set<string>();
  let skipped = 0;
  for (const record of records) {
    if (assess(record, product, now).status !== "QUALIFIED") {
      skipped++;
      continue;
    }
    const c = record.contacts.find((c) => contactQualified(c, now));
    if (!c) {
      skipped++;
      continue;
    }
    const key = `${record.name.toLowerCase()}|${c.email.toLowerCase()}`;
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    rows.push(`${csvCell(record.name)},${csvCell(c.email.toLowerCase())}`);
  }
  return { csv: rows.join("\r\n") + "\r\n", count: rows.length - 1, skipped };
}
