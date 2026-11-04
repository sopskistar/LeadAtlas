// Linguistic category aliases, not inferred business identities. Geography and all
// evidence/quality gates still apply to every candidate returned by these filters.
export function nicheTerms(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  // Narrow customer-facing terms win over a broader NAICS title. The canonical
  // code is metadata, not permission to expand plumbing into HVAC/construction.
  if (/^(plumber|plumbers|plumbing)(_|$)/.test(normalized)) return ["plumb"];
  if (/^(electrician|electricians|electrical_contractor)(_|$)/.test(normalized))
    return ["electrician", "electrical_contractor", "electrical contractor"];
  const aliases: Record<string, string[]> = {
    plumber: ["plumb"],
    plumbers: ["plumb"],
    plumbing: ["plumb"],
    electrician: ["electric"],
    electricians: ["electric"],
    roofer: ["roof"],
    roofers: ["roof"],
    cleaner: ["clean"],
    cleaners: ["clean"],
    hvac: ["hvac", "heating", "air_condition"],
    dentist: ["dent"],
    dentists: ["dent"],
  };
  return (
    aliases[normalized] ?? [
      ...new Set([normalized, normalized.replaceAll("_", " ")]),
    ]
  );
}
