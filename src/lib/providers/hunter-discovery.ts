import { parse } from "tldts";
import type { BusinessRecord, Contact } from "../core/types";
import { fresh } from "../core/quality";
export async function sourcedHunterContacts(
  record: BusinessRecord,
  consume: (provider: string) => Promise<void>,
): Promise<Contact[]> {
  if (
    !process.env.HUNTER_API_KEY ||
    process.env.HUNTER_REUSE_APPROVED !== "true" ||
    record.website?.status !== "OWNED_SITE_FOUND" ||
    !record.website.identity ||
    !record.website.url
  )
    return [];
  const domain = parse(new URL(record.website.url).hostname).domain;
  if (!domain) return [];
  await consume("hunter");
  const url = new URL("https://api.hunter.io/v2/domain-search");
  url.searchParams.set("domain", domain);
  url.searchParams.set("type", "generic");
  url.searchParams.set("limit", "3");
  url.searchParams.set("provenance", "found");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.HUNTER_API_KEY}` },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as {
    data?: {
      domain?: string;
      emails?: {
        value: string;
        type?: string;
        provenance?: string;
        sources?: {
          uri: string;
          last_seen_on?: string;
          still_on_page?: boolean;
        }[];
      }[];
    };
  };
  if (payload.data?.domain !== domain) return [];
  return (payload.data.emails ?? [])
    .flatMap((item) => {
      if (
        item.type !== "generic" ||
        item.provenance !== "found" ||
        !item.value ||
        parse(item.value.split("@")[1] ?? "").domain !== domain
      )
        return [];
      // Only first-party public source URLs and recent actual source dates can establish binding.
      const evidence = item.sources?.find((s) => {
        try {
          return (
            s.still_on_page === true &&
            parse(new URL(s.uri).hostname).domain === domain &&
            fresh(s.last_seen_on, 90)
          );
        } catch {
          return false;
        }
      });
      if (!evidence) return [];
      return [
        {
          email: item.value.toLowerCase(),
          sourceUrl: evidence.uri,
          foundAt: new Date(evidence.last_seen_on!).toISOString(),
          binding: "EXACT_BUSINESS" as const,
          rights: {
            source: "hunter",
            url: evidence.uri,
            license:
              "Hunter contracted reuse approved by operator; first-party public source",
            persist: true,
            export: true,
            attribution:
              "Hunter sourced Domain Search with public page evidence",
          },
        },
      ];
    })
    .slice(0, 3);
}
