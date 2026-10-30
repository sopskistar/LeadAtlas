import { parse } from "tldts";
import { normalizeName } from "./normalize";
import { domainSchema } from "./validation";
import type { BusinessRecord } from "./types";
function stem(value: string) {
  return parse(value).domainWithoutSuffix?.replace(/-/g, "") ?? "";
}
export function editDistance(a: string, b: string) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        next[j - 1] + 1,
        row[j] + 1,
        row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    row = next;
  }
  return row[b.length];
}
export function matchDomain(
  domain: string,
  business: BusinessRecord,
  kind: "brandable" | "personal" | "exact",
): BusinessRecord["domainMatch"] {
  domainSchema.parse(domain);
  const target = stem(domain);
  const brand = normalizeName(business.name);
  const sites = business.websites
    .map((v) => {
      try {
        return new URL(v).hostname.replace(/^www\./, "");
      } catch {
        return "";
      }
    })
    .filter(Boolean);
  for (const site of sites) {
    const existing = stem(site);
    const registered = parse(site).domain;
    if (registered === domain) continue;
    const exactBrand = brand === target;
    let tier = "";
    let rank = 0;
    let reason = "";
    if (existing === target) {
      tier = "EXACT_STEM_DIFFERENT_TLD";
      rank = 3;
      reason = `Existing domain ${site} has the exact registered brand stem`;
    } else if (
      (target.length >= 6 &&
        ["get", "try", "my", "the", "go"].some(
          (p) => existing === p + target,
        )) ||
      (target.length >= 6 &&
        ["ai", "app", "hq", "co", "group", "online", "services"].some(
          (s) => existing === target + s,
        ))
    ) {
      tier = "PREFIX_SUFFIX";
      rank = 2;
      reason = `Existing domain ${site} adds a bounded brand prefix/suffix`;
    } else if (
      target.length >= 8 &&
      editDistance(existing, target) === 1 &&
      exactBrand
    ) {
      tier = "CONFIRMED_SHORT_VARIATION";
      rank = 1;
      reason = `One-character domain variation supported by exact business name`;
    }
    if (rank && (kind !== "personal" || exactBrand))
      return {
        domain,
        tier,
        rank,
        reasons: [
          reason,
          "Association strength only; no inference of buying intent",
        ],
        ambiguous: kind === "personal",
      };
  }
  return undefined;
}
export function rankDomainMatches(
  domain: string,
  records: BusinessRecord[],
  kind: "brandable" | "personal" | "exact",
) {
  return records
    .map((r) => ({ ...r, domainMatch: matchDomain(domain, r, kind) }))
    .filter((r) => r.domainMatch)
    .sort(
      (a, b) =>
        b.domainMatch!.rank - a.domainMatch!.rank ||
        a.name.localeCompare(b.name),
    );
}
