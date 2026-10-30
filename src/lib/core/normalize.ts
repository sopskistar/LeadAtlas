import { parse } from "tldts";
import type { BusinessRecord } from "./types";
export const normalizeName = (v: string) =>
  v
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\b(incorporated|corporation|limited|llc|inc|ltd|corp)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
export function identityKey(
  record: Pick<BusinessRecord, "name" | "country" | "region" | "city">,
) {
  return [
    normalizeName(record.name),
    record.country,
    record.region,
    normalizeName(record.city),
  ].join(":");
}
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`)
        .join(",") +
      "}"
    );
  return JSON.stringify(value) ?? "null";
}
const platforms = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "yelp.com",
  "google.com",
  "goo.gl",
  "maps.app.goo.gl",
  "yellowpages.com",
  "yellowpages.ca",
  "bbb.org",
  "tiktok.com",
  "x.com",
  "youtube.com",
  "linktr.ee",
  "angi.com",
  "thumbtack.com",
];
export function independentWebsite(value: string) {
  try {
    const url = new URL(value);
    const p = parse(url.hostname);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !!p.domain &&
      !platforms.includes(p.domain)
    );
  } catch {
    return false;
  }
}
export function sameBusiness(a: BusinessRecord, b: BusinessRecord) {
  if (a.source === b.source && a.sourceId === b.sourceId) return true;
  // A shared franchise domain alone never merges different locations.
  return identityKey(a) === identityKey(b);
}
export function mergeRecords(
  a: BusinessRecord,
  b: BusinessRecord,
): BusinessRecord {
  return {
    ...a,
    websites: [...new Set([...a.websites, ...b.websites])],
    socials: [...new Set([...a.socials, ...b.socials])],
    contacts: [
      ...a.contacts,
      ...b.contacts.filter(
        (c) =>
          !a.contacts.some(
            (old) => old.email.toLowerCase() === c.email.toLowerCase(),
          ),
      ),
    ],
    evidence: [...a.evidence, ...b.evidence].filter(
      (e, i, arr) =>
        arr.findIndex(
          (x) =>
            x.kind === e.kind &&
            x.url === e.url &&
            x.observedAt === e.observedAt,
        ) === i,
    ),
    operatingStatus:
      a.operatingStatus === "permanently_closed" ||
      b.operatingStatus === "permanently_closed"
        ? "permanently_closed"
        : a.operatingStatus,
    fieldRights: { ...b.fieldRights, ...a.fieldRights },
  };
}
