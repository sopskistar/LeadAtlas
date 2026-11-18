import { z } from "zod";
const positive = (fallback: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === undefined ? fallback : v),
    z.coerce.number().int().min(1).max(max),
  );
const nonNegativeMoney = (fallback: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === undefined ? fallback : v),
    z.coerce.number().finite().min(0).max(max),
  );
const limitsSchema = z.object({
  MAX_SEARCH_RESULTS: positive(50, 100),
  SEARCH_INITIAL_RESULTS: positive(10, 100),
  SEARCH_QUERY_BUDGET: positive(20, 200),
  DAILY_SEARCH_BUDGET: positive(500, 100000),
  MONTHLY_SEARCH_BUDGET: positive(5000, 500000),
  PROVIDER_DAILY_LIMIT: positive(500, 100000),
  PROVIDER_MONTHLY_LIMIT: positive(5000, 500000),
  API_GLOBAL_PER_MINUTE_LIMIT: positive(3000, 100000),
  API_USER_PER_MINUTE_LIMIT: positive(180, 10000),
  API_PUBLIC_PER_MINUTE_LIMIT: positive(120, 10000),
  API_SEARCHES_PER_HOUR_LIMIT: positive(8, 1000),
  TRUST_PROXY_HEADERS: z.preprocess(
    (v) => v === "true",
    z.boolean().default(false),
  ),
  PROVIDER_DAILY_SPEND_USD: nonNegativeMoney(0, 1000),
  // Spend is stored in micro-USD in PostgreSQL integer counters; keep the
  // operator ceiling within the signed 32-bit range.
  PROVIDER_MONTHLY_SPEND_USD: nonNegativeMoney(0, 2000),
  BRAVE_MAX_CALL_COST_USD: nonNegativeMoney(0, 100),
  DATAFORSEO_MAX_CALL_COST_USD: nonNegativeMoney(0, 100),
  HUNTER_MAX_CALL_COST_USD: nonNegativeMoney(0, 100),
  RESEND_MAX_CALL_COST_USD: nonNegativeMoney(0, 100),
  GOOGLE_MAX_CALL_COST_USD: nonNegativeMoney(0, 100),
  META_MAX_CALL_COST_USD: nonNegativeMoney(0, 100),
  AI_MAX_CALL_COST_USD: nonNegativeMoney(0, 100),
  OTHER_PAID_MAX_CALL_COST_USD: nonNegativeMoney(0, 100),
  INGEST_BATCH_LIMIT: positive(500, 1000),
  EMAIL_FRESH_DAYS: positive(30, 90),
  SITE_FRESH_DAYS: positive(30, 90),
  ACTIVITY_FRESH_DAYS: positive(90, 180),
});
export function limits() {
  return limitsSchema.parse(process.env);
}
const providerCostSetting: Record<string, keyof ReturnType<typeof limits>> = {
  brave: "BRAVE_MAX_CALL_COST_USD",
  dataforseo: "DATAFORSEO_MAX_CALL_COST_USD",
  hunter: "HUNTER_MAX_CALL_COST_USD",
  resend: "RESEND_MAX_CALL_COST_USD",
  google: "GOOGLE_MAX_CALL_COST_USD",
  facebook: "META_MAX_CALL_COST_USD",
  instagram: "META_MAX_CALL_COST_USD",
  meta: "META_MAX_CALL_COST_USD",
  ai: "AI_MAX_CALL_COST_USD",
  otari: "AI_MAX_CALL_COST_USD",
  other_paid: "OTHER_PAID_MAX_CALL_COST_USD",
};
export function providerCallCostUsd(provider: string) {
  const key = providerCostSetting[provider.toLowerCase()];
  if (!key) return 0;
  const value = limits()[key];
  return typeof value === "number" ? value : 0;
}
export function providerSpendConfigured(provider: string) {
  const config = limits();
  return (
    config.PROVIDER_DAILY_SPEND_USD > 0 &&
    config.PROVIDER_MONTHLY_SPEND_USD > 0 &&
    providerCallCostUsd(provider) > 0
  );
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
