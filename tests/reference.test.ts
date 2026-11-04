import { describe, it, expect } from "vitest";
import {
  citySuggestions,
  nicheSuggestions,
  validCategoryChoice,
} from "../src/lib/reference/lookups";
import { nicheTerms } from "../src/lib/core/niche";
import { regions } from "../src/lib/core/locations";
import { searchSchema } from "../src/lib/core/validation";
describe("sourced geography reference", () => {
  it("has reference suggestions in all 50 states, DC, and Canadian provinces and territories", () => {
    for (const [country, list] of Object.entries(regions))
      for (const region of Object.keys(list))
        expect(
          citySuggestions(country, region, "").cities.length,
          `${country}-${region}`,
        ).toBeGreaterThan(0);
  });
  it("constrains city prefixes to region and supports paginated browsing", () => {
    expect(citySuggestions("US", "NY", "New York").cities).toContain(
      "New York City",
    );
    expect(citySuggestions("US", "CA", "New York").cities).not.toContain(
      "New York City",
    );
    expect(citySuggestions("CA", "ON", "Toro").cities).toContain("Toronto");
    const first = citySuggestions("US", "CA", "");
    expect(first.nextOffset).toBe(30);
    expect(
      citySuggestions("US", "CA", "", 30).cities.some((c) =>
        first.cities.includes(c),
      ),
    ).toBe(false);
    expect(() => citySuggestions("CA", "NY", "")).toThrow();
    expect(citySuggestions("US", "NY", "A missing custom town").cities).toEqual(
      [],
    );
  });
  it("accepts a custom city and niche without fabricating coverage", () => {
    expect(
      searchSchema.parse({
        product: "contacts",
        country: "US",
        region: "NY",
        city: "Custom test hamlet",
        niche: "Specialist fixture service",
        sources: ["imports"],
      }),
    ).toMatchObject({ city: "Custom test hamlet" });
  });
});
describe("six-digit niche taxonomy and narrow synonyms", () => {
  it("offers common plumbing labels with canonical identifiers", () => {
    const matches = nicheSuggestions("plum");
    for (const label of ["Plumber", "Plumbing contractor", "Plumbing services"])
      expect(matches).toContainEqual({ id: "naics:2022:238220", label });
    expect(matches.some((m) => m.label === "Construction")).toBe(false);
  });
  it("does not broaden plumber aliases to HVAC or construction", () => {
    for (const label of ["Plumber", "Plumbing contractor", "Plumbing services"])
      expect(nicheTerms(label)).toEqual(["plumb"]);
    expect(nicheTerms("Custom niche")).toContain("custom niche");
    expect(validCategoryChoice("naics:2022:238220", "Plumber")).toBe(true);
    expect(validCategoryChoice("naics:2022:238220", "Landscaper")).toBe(false);
  });
  it("accepts long published six-digit category titles without truncation", () => {
    const choice = nicheSuggestions("Warm Air Heating").find(
      (c) => c.label.length > 100,
    );
    expect(choice).toBeDefined();
    expect(
      searchSchema.safeParse({
        product: "contacts",
        country: "US",
        region: "NY",
        city: "Albany",
        niche: choice!.label,
        categoryId: choice!.id,
        sources: ["imports"],
      }).success,
    ).toBe(true);
  });
  it.each([
    "Dentist",
    "Barber",
    "Auto mechanic",
    "Restaurant",
    "Real estate agent",
    "Accountant",
    "Florist",
    "Locksmith",
  ])("supports %s", (label) => {
    expect(nicheSuggestions(label).some((m) => m.label === label)).toBe(true);
  });
});
