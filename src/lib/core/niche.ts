// Linguistic category aliases, not inferred business identities. Geography and all
// evidence/quality gates still apply to every candidate returned by these filters.
export function nicheTerms(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
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
