// This module is imported only by server handlers and tests. Full references are
// never serialized to the client; prefix indexes return bounded pages.
import cities from "./cities.json";
import categories from "./categories.json";
import { regions, validRegion } from "../core/locations";
export const referenceKey = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
const cityIndexes = new Map<string, { label: string; key: string }[]>();
export function citySuggestions(
  country: string,
  region: string,
  query: string,
  offset = 0,
) {
  if (
    !Object.hasOwn(regions, country) ||
    !validRegion(country as "US" | "CA", region)
  )
    throw new Error("Choose a valid country and region.");
  const scope = `${country}-${region}`;
  let index = cityIndexes.get(scope);
  if (!index) {
    index = ((cities as Record<string, string[]>)[scope] ?? [])
      .map((label) => ({ label, key: referenceKey(label) }))
      .sort((a, b) =>
        a.key < b.key ? -1 : a.key > b.key ? 1 : a.label.localeCompare(b.label),
      );
    cityIndexes.set(scope, index);
  }
  const prefix = referenceKey(query).slice(0, 100);
  let low = 0,
    high = index.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (index[mid].key < prefix) low = mid + 1;
    else high = mid;
  }
  const start = low + Math.min(100000, Math.max(0, Math.trunc(offset) || 0));
  const page = index
    .slice(start, start + 31)
    .filter((v) => v.key.startsWith(prefix));
  return {
    cities: page.slice(0, 30).map((v) => v.label),
    nextOffset: page.length > 30 ? start - low + 30 : null,
    attribution: "GeoNames, CC BY 4.0",
    customEntry: true,
  };
}
// Exact six-digit industry identifiers, enriched with customer-facing synonyms.
// A plumbing choice never expands to all construction (or all HVAC in 238220).
const aliases: Record<string, string[]> = {
  "238220": [
    "Plumber",
    "Plumbing contractor",
    "Plumbing services",
    "HVAC contractor",
    "Heating contractor",
    "Air conditioning contractor",
  ],
  "238210": ["Electrician", "Electrical contractor"],
  "238160": ["Roofer", "Roofing contractor"],
  "238350": ["Carpenter", "Finish carpenter"],
  "238320": ["Painter", "Painting contractor"],
  "236118": ["Home remodeler", "Renovation contractor"],
  "236115": ["Home builder"],
  "561720": ["Cleaner", "Commercial cleaning", "Janitorial service"],
  "561730": ["Landscaper", "Lawn care", "Tree service"],
  "561710": ["Pest control", "Exterminator"],
  "238140": ["Mason", "Masonry contractor"],
  "238110": ["Concrete contractor"],
  "238330": ["Flooring contractor"],
  "811111": ["Auto mechanic", "Auto repair shop"],
  "811121": ["Auto body shop"],
  "811192": ["Car wash"],
  "541110": ["Lawyer", "Law firm", "Attorney"],
  "541211": ["Accountant", "CPA"],
  "541219": ["Bookkeeper"],
  "541310": ["Architect"],
  "541330": ["Engineer", "Engineering firm"],
  "541512": ["IT consultant"],
  "541810": ["Advertising agency", "Marketing agency"],
  "541430": ["Graphic designer"],
  "621210": ["Dentist", "Dental clinic"],
  "621111": ["Doctor", "Medical practice"],
  "621310": ["Chiropractor"],
  "621320": ["Optometrist"],
  "621340": ["Physiotherapist", "Physical therapist"],
  "812112": ["Hair salon", "Hairdresser"],
  "812111": ["Barber", "Barbershop"],
  "812113": ["Nail salon"],
  "722511": ["Restaurant"],
  "722515": ["Coffee shop", "Cafe"],
  "721110": ["Hotel", "Motel"],
  "531210": ["Real estate agent", "Realtor", "Real estate broker"],
  "531311": ["Property manager"],
  "459410": ["Office supply store"],
  "445110": ["Grocery store"],
  "459310": ["Florist"],
  "541940": ["Veterinarian", "Vet clinic"],
  "812910": ["Pet groomer"],
  "624410": ["Child care", "Daycare"],
  "713940": ["Gym", "Fitness center"],
  "811412": ["Appliance repair"],
  "561622": ["Locksmith"],
};
const categoryById = new Map(categories.map((c) => [c.id, c]));
const nicheIndex = categories.flatMap((c) =>
  [...new Set([...(aliases[c.id.slice(-6)] ?? []), c.title])].map((label) => ({
    id: c.id,
    label,
    key: referenceKey(label),
  })),
);
export function nicheSuggestions(query: string) {
  const q = referenceKey(query).slice(0, 100);
  if (!q)
    return nicheIndex
      .filter((n) =>
        [
          "Plumber",
          "Electrician",
          "Dentist",
          "Hair salon",
          "Restaurant",
          "Auto mechanic",
          "Accountant",
          "Landscaper",
          "Real estate agent",
        ].includes(n.label),
      )
      .map(({ id, label }) => ({ id, label }));
  return nicheIndex
    .filter((n) => n.key.includes(q))
    .sort(
      (a, b) =>
        Number(b.key.startsWith(q)) - Number(a.key.startsWith(q)) ||
        a.label.length - b.label.length ||
        a.label.localeCompare(b.label),
    )
    .slice(0, 25)
    .map(({ id, label }) => ({ id, label }));
}
export function validCategoryChoice(id: string, label: string) {
  return (
    categoryById.has(id) &&
    nicheIndex.some((n) => n.id === id && n.key === referenceKey(label))
  );
}
