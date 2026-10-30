import { describe, it, expect } from "vitest";
import { business } from "./fixtures/business";
import { matchDomain, rankDomainMatches } from "../src/lib/core/domain";
import { domainSchema, searchSchema } from "../src/lib/core/validation";
import { regions } from "../src/lib/core/locations";
describe("targeted buyer matching", () => {
  it("ranks a proven prefixed brand before unrelated ocean businesses", () => {
    const records = [
      business({
        name: "Ocean Company",
        websites: ["https://oceancompany.com"],
      }),
      business({ name: "Oceanwise", websites: ["https://getoceanwise.com"] }),
    ];
    const result = rankDomainMatches("oceanwise.com", records, "brandable");
    expect(result).toHaveLength(1);
    expect(result[0].domainMatch!.tier).toBe("PREFIX_SUFFIX");
  });
  it("ranks the exact stem on a different TLD first", () => {
    const records = [
      business({ name: "Oceanwise", websites: ["https://getoceanwise.com"] }),
      business({ name: "Oceanwise", websites: ["https://oceanwise.xyz"] }),
    ];
    expect(
      rankDomainMatches("oceanwise.com", records, "brandable")[0].domainMatch!
        .rank,
    ).toBe(3);
  });
  it("excludes generic city-and-niche matches for an EMD", () => {
    const records = [
      business({
        name: "Ace Plumbing Los Angeles",
        websites: ["https://aceplumbing.com"],
      }),
      business({
        name: "Los Angeles Plumber",
        websites: ["https://losangelesplumber.xyz"],
      }),
    ];
    const result = rankDomainMatches("losangelesplumber.com", records, "exact");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Los Angeles Plumber");
  });
  it("allows a short typo only with exact name corroboration", () => {
    expect(
      matchDomain(
        "oceanwise.com",
        business({ name: "Oceanwise", websites: ["https://oceanwize.com"] }),
        "brandable",
      )?.rank,
    ).toBe(1);
    expect(
      matchDomain(
        "oceanwise.com",
        business({
          name: "Another Company",
          websites: ["https://oceanwize.com"],
        }),
        "brandable",
      ),
    ).toBeUndefined();
  });
  it("personal common names remain ambiguous rather than merging people", () => {
    const result = rankDomainMatches(
      "janesmith.com",
      [
        business({
          name: "Jane Smith",
          city: "New York",
          websites: ["https://janesmith.xyz"],
        }),
        business({
          name: "Jane Smith",
          city: "Toronto",
          websites: ["https://getjanesmith.com"],
        }),
      ],
      "personal",
    );
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.domainMatch!.ambiguous)).toBe(true);
  });
  it("excludes the seller's exact existing domain", () => {
    expect(
      matchDomain(
        "oceanwise.com",
        business({ name: "Oceanwise", websites: ["https://oceanwise.com"] }),
        "brandable",
      ),
    ).toBeUndefined();
  });
  it.each([
    "https://oceanwise.com",
    "foo.oceanwise.com",
    "xn--bcher-kva.com",
    "localhost",
    "foo.com/path",
    "foo..com",
  ])("rejects unsafe or nonregistered input %s", (v) =>
    expect(domainSchema.safeParse(v).success).toBe(false),
  );
  it("supports every state/DC and every Canadian province/territory", () => {
    expect(Object.keys(regions.US)).toHaveLength(51);
    expect(Object.keys(regions.CA)).toHaveLength(13);
  });
  it.each([
    ["US", "NY", "New York"],
    ["CA", "ON", "Toronto"],
  ])("accepts %s location", (country, region, city) => {
    expect(
      searchSchema.safeParse({
        product: "contacts",
        country,
        region,
        city,
        niche: "a custom niche",
        sources: ["imports"],
        limit: 10,
        queryBudget: 10,
      }).success,
    ).toBe(true);
  });
});
