import { randomUUID } from "node:crypto";
import type { BusinessRecord } from "../../src/lib/core/types";
export const NOW = new Date("2026-10-30T12:00:00Z");
export function business(
  overrides: Partial<BusinessRecord> = {},
): BusinessRecord {
  const now = NOW.toISOString();
  const right = {
    source: "test-owned",
    url: "https://alpha.example/contact",
    license: "TEST ONLY",
    persist: true,
    export: true,
    attribution: "Deterministic test fixture; never production data",
  };
  return {
    id: randomUUID(),
    source: "imports",
    sourceId: randomUUID(),
    name: "Alpha Plumbing",
    country: "US",
    region: "NY",
    city: "New York",
    niche: "plumber",
    websites: ["https://alpha.example"],
    socials: [],
    contacts: [
      {
        email: "hello@alpha.example",
        sourceUrl: right.url,
        foundAt: now,
        binding: "EXACT_BUSINESS",
        rights: right,
        verification: {
          status: "LIKELY_DELIVERABLE",
          provider: "hunter",
          nativeStatus: "valid",
          checkedAt: now,
          mx: "PRESENT",
          detail: "TEST provider fixture",
        },
      },
    ],
    evidence: [
      {
        kind: "activity",
        url: "https://alpha.example/news",
        observedAt: now,
        source: "test-owned",
        detail: "TEST current dated trading evidence",
        independent: false,
      },
      {
        kind: "activity",
        url: "https://chamber.example/member/alpha",
        observedAt: now,
        source: "test-directory",
        detail: "TEST independent business activity evidence",
        independent: true,
      },
    ],
    fieldRights: { name: right, email: right },
    operatingStatus: "open",
    importedAt: now,
    website: {
      status: "OWNED_SITE_FOUND",
      identity: true,
      functional: true,
      checkedAt: now,
      url: "https://alpha.example",
      detail: "TEST identity-matched website",
    },
    fixture: true,
    ...overrides,
  };
}
export const page = `<html><head><title>Alpha Plumbing</title></head><body><h1>Alpha Plumbing</h1><p>Alpha Plumbing provides plumbing repairs and professional drain service for commercial businesses in New York. Please contact our business office for service information and availability. Our dedicated team handles appointments and customer support.</p><a href="/contact">Contact us</a><a href="mailto:hello@alpha.example">Business email</a></body></html>`;
