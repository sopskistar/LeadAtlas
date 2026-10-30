import { z } from "zod";
const positive = (fallback: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === undefined ? fallback : v),
    z.coerce.number().int().min(1).max(max),
  );
const limitsSchema = z.object({
  MAX_SEARCH_RESULTS: positive(50, 100),
  DAILY_SEARCH_BUDGET: positive(500, 100000),
  PROVIDER_DAILY_LIMIT: positive(500, 100000),
  INGEST_BATCH_LIMIT: positive(500, 1000),
  EMAIL_FRESH_DAYS: positive(30, 90),
  SITE_FRESH_DAYS: positive(30, 90),
  ACTIVITY_FRESH_DAYS: positive(90, 180),
});
export function limits() {
  return limitsSchema.parse(process.env);
}
export const permittedEvidenceUrl = z.url().refine((v) => {
  try {
    const u = new URL(v);
    return (
      ["http:", "https:"].includes(u.protocol) && !u.username && !u.password
    );
  } catch {
    return false;
  }
}, "Evidence must use a public HTTP(S) URL without credentials");
export function restrictedExportOrigin(value: string) {
  try {
    return /(^|\.)(google\.[a-z.]+|googleapis\.com|facebook\.com|instagram\.com|yelp\.[a-z.]+|linkedin\.com)$/.test(
      new URL(value).hostname,
    );
  } catch {
    return true;
  }
}
