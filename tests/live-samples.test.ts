import { readFile } from "node:fs/promises";
import { describe, it, expect } from "vitest";
import { parseImport } from "../src/lib/server/imports";
import { assess } from "../src/lib/core/quality";
import { qualifiedCsv } from "../src/lib/core/csv";
import { nicheTerms } from "../src/lib/core/niche";
describe("actual public Overture sample contract (no live request in test)", () => {
  it.each([
    ["nyc", 4, "US"],
    ["toronto", 5, "CA"],
  ] as const)(
    "parses %s provenance and keeps raw emails unverified",
    async (city, count, country) => {
      const root = "samples/overture-2026-10-21.0/";
      const manifest = JSON.parse(
        await readFile(`${root}${city}-plumbers.manifest.json`, "utf8"),
      );
      const records = parseImport({
        ...manifest,
        content: await readFile(manifest.file, "utf8"),
      });
      expect(records).toHaveLength(count);
      expect(records.every((r) => r.country === country)).toBe(true);
      expect(
        records.every((r) => r.contacts.every((c) => !c.verification)),
      ).toBe(true);
      expect(
        records.every((r) => assess(r, "contacts").status !== "QUALIFIED"),
      ).toBe(true);
      expect(qualifiedCsv(records, "contacts").count).toBe(0);
      expect(manifest.permissionConfirmed).toBe(false);
    },
  );
  it("maps plumber searches to the actual plumbing taxonomy without claiming identity", () => {
    expect(nicheTerms("plumber")).toEqual(["plumb"]);
    expect(nicheTerms("a custom niche")).toEqual([
      "a_custom_niche",
      "a custom niche",
    ]);
  });
});
