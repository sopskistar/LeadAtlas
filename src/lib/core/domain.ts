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
export function normalizeDomain(value: string) {
  const domain = domainSchema.parse(value);
  const parsed = parse(domain);
  return {
    domain,
    stem: parsed.domainWithoutSuffix!,
    extension: parsed.publicSuffix!,
  };
}
export type DomainStrategy = "auto" | "brandable" | "personal" | "exact";
const prefixes = ["get", "try", "my", "the", "go", "use", "hello"];
const suffixes = [
  "ai",
  "app",
  "hq",
  "co",
  "group",
  "online",
  "services",
  "global",
  "digital",
  "studio",
  "solutions",
  "tech",
  "company",
  "consulting",
  "media",
  "design",
  "law",
  "legal",
  "clinic",
];
export function domainQueries(domain: string, context = "") {
  const { stem: name } = normalizeDomain(domain);
  // Exact phrases and bounded affixes, never a generic industry-wide query.
  return [
    ...new Set([
      `"${name}" official company ${context}`,
      `"${name}" website contact ${context}`,
      `"get${name}" OR "${name}hq" OR "${name}group"`,
      `"${name}" -site:${domain} business`,
    ]),
  ].map((q) => q.trim().slice(0, 450));
}
export function matchDomain(
  domain: string,
  business: BusinessRecord,
  kind: DomainStrategy = "auto",
): BusinessRecord["domainMatch"] {
  domain = normalizeDomain(domain).domain;
  const target = stem(domain);
  const brand = normalizeName(business.name);
  const sites = business.websites.flatMap((v) => {
    try {
      return [new URL(v).hostname.replace(/^www\./, "")];
    } catch {
      return [];
    }
  });
  const matches: NonNullable<BusinessRecord["domainMatch"]>[] = [];
  for (const site of sites) {
    const existing = stem(site);
    const registered = parse(site).domain;
    if (!registered || registered === domain || !existing) continue;
    const exactBrand = brand === target;
    // Name and operating domain must agree. Similar spelling alone never merges identities.
    const aligned = exactBrand || brand === existing;
    if (!aligned) continue;
    let tier = "",
      rank = 0,
      reason = "";
    if (existing === target) {
      tier =
        parse(site).domainWithoutSuffix?.includes("-") && !domain.includes("-")
          ? "HYPHENATED"
          : "EXACT_STEM_DIFFERENT_TLD";
      rank = 3;
      reason = `Current domain ${site} uses the same brand stem as ${domain}`;
    } else if (
      target.length >= 5 &&
      (prefixes.some((p) => existing === p + target) ||
        suffixes.some((s) => existing === target + s))
    ) {
      tier = "PREFIX_SUFFIX";
      rank = 2;
      reason = `Current domain ${site} adds a bounded prefix or suffix to the matched brand`;
    } else if (
      target.length >= 6 &&
      exactBrand &&
      (new RegExp(`^${target}[0-9]{1,3}$`).test(existing) ||
        new RegExp(`^[0-9]{1,3}${target}$`).test(existing))
    ) {
      tier = "NUMBER_VARIATION";
      rank = 2;
      reason = `Current domain ${site} adds numbers; the business name independently matches the target stem`;
    } else if (
      kind !== "exact" &&
      target.length >= 8 &&
      editDistance(existing, target) === 1 &&
      exactBrand
    ) {
      tier = "CONFIRMED_SHORT_VARIATION";
      rank = 1;
      reason =
        "One-character domain variation supported by an exact business name; review spelling and identity";
    }
    if (!rank || (kind === "personal" && !exactBrand)) continue;
    const personal =
      kind === "personal" ||
      (kind === "auto" &&
        /^(jane|john|james|mary|michael|sarah|david|robert|jennifer|william)[a-z]{3,}$/.test(
          target,
        ));
    matches.push({
      domain,
      tier,
      rank,
      reasons: [
        reason,
        "Domain relationship only; no evidence of buying intent or a weakness in the current domain",
        ...(personal
          ? [
              "Personal identity and professional relevance require manual review",
            ]
          : []),
      ],
      ambiguous: personal,
    });
  }
  return matches.sort((a, b) => b.rank - a.rank)[0];
}
export function domainMatchStatus(record: BusinessRecord) {
  if (
    !record.domainMatch ||
    record.suppressed ||
    record.quality?.status === "REJECTED" ||
    ["CLOSED", "TEMPORARILY_CLOSED"].includes(record.quality?.activity ?? "") ||
    record.website?.status === "PARKED_OR_FOR_SALE"
  )
    return "REJECTED_OR_IRRELEVANT";
  if (
    record.domainMatch.ambiguous ||
    !record.website?.identity ||
    !record.website.functional ||
    record.quality?.activity !== "LIKELY_ACTIVE"
  )
    return "NEEDS_REVIEW";
  return record.domainMatch.rank >= 2 ? "STRONG_MATCH" : "POSSIBLE_MATCH";
}
export function rankDomainMatches(
  domain: string,
  records: BusinessRecord[],
  kind: DomainStrategy = "auto",
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
