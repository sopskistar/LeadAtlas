import type { LeadSourceAdapter, SearchInput, SourceInfo } from "../core/types";
import { getDb } from "../db";
import { businesses } from "../db/schema";
import { and, eq, ilike, gte, lte, or } from "drizzle-orm";
import { nicheTerms } from "../core/niche";
export function sourceRegistry(): SourceInfo[] {
  const source = (
    id: string,
    displayName: string,
    docs: string,
    licensePolicy: string,
    limitations: string,
    key?: string,
    reusable = false,
  ): SourceInfo => ({
    id,
    displayName,
    docs,
    licensePolicy,
    limitations,
    availability: ["facebook", "instagram", "google"].includes(id)
      ? "RESTRICTED"
      : key
        ? process.env[key]
          ? "CONFIGURED_UNTESTED"
          : "MISSING_CREDENTIALS"
        : reusable
          ? "READY_FOR_IMPORT"
          : "NOT_CONNECTED",
    permittedPersistenceFields: reusable
      ? ["name", "location", "website", "email", "evidence"]
      : [],
    permittedExportFields: reusable ? ["name", "email"] : [],
    requiresKey: !!key,
    rawRetention:
      "No raw API payload retention; normalized licensed fields and evidence only",
    batchLimit: 50,
  });
  return [
    source(
      "facebook",
      "Facebook Pages",
      "https://developers.facebook.com/docs/features-reference/page-public-content-access/",
      "Meta App Review, Page Public Content Access and approved use case required",
      "Restricted. No bulk local-business discovery or lead exports. Tokens do not grant resale rights.",
      "META_ACCESS_TOKEN",
    ),
    source(
      "instagram",
      "Instagram professional profiles",
      "https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery/",
      "Approved Instagram Business Discovery permissions and professional-account access required",
      "Restricted. Known professional usernames only; not a general city/niche or email directory.",
      "META_ACCESS_TOKEN",
    ),
    source(
      "google",
      "Google Places API (New)",
      "https://developers.google.com/maps/documentation/places/web-service/policies",
      "Display-only review required. No persistent commercial lead fields or CSV export",
      "Restricted. The research endpoint requests place IDs only; no Google-derived lead pipeline.",
      "GOOGLE_PLACES_API_KEY",
    ),
    source(
      "overture",
      "Overture Maps Places",
      "https://docs.overturemaps.org/guides/places/",
      "Per-record CDLA-Permissive-2.0, Apache-2.0 or CC0-1.0; preserve attribution",
      "Bounded regional import required. Source open status alone does not prove current trading.",
      undefined,
      true,
    ),
    source(
      "brave",
      "Brave Search",
      "https://brave.com/search/api/",
      "Transient discovery only; API plan does not grant website content rights",
      "No raw results or snippets saved. Website candidates require independent checks and host permission.",
      "BRAVE_SEARCH_API_KEY",
    ),
    source(
      "website",
      "Permitted business websites",
      "https://leadatlas.xyz/terms",
      "Explicit per-host terms review and permission; robots checked each run",
      "Bounded public contact research on the separate worker. No login, CAPTCHA bypass or browser stealth.",
      undefined,
      true,
    ),
    source(
      "imports",
      "Authorized directory / CSV imports",
      "https://leadatlas.xyz/settings/sources",
      "Administrator confirms provenance and storage/export rights for each batch",
      "No blanket rights to chambers, directories or trade associations.",
      undefined,
      true,
    ),
    source(
      "hunter",
      "Hunter verification & sourced enrichment",
      "https://hunter.io/api-documentation",
      "Verifier requires key; domain search also requires approved reuse terms",
      "Configured does not mean live-tested. Valid results are assessments, not delivery guarantees.",
      "HUNTER_API_KEY",
    ),
    source(
      "canada",
      "Corporations Canada",
      "https://ised-isde.canada.ca/site/corporations-canada/en/data-services",
      "Open Government Licence – Canada for approved federal dataset imports",
      "Federal entities only. Incorporation and legal active status do not prove trading or supply contact emails.",
      undefined,
      true,
    ),
    ...["yelp", "azure", "foursquare", "linkedin", "us_registries"].map((id) =>
      source(
        id,
        id.replaceAll("_", " "),
        "https://leadatlas.xyz/settings/sources",
        "Provider-specific authorization and licence review required",
        "Not connected. No production data retrieval implemented.",
      ),
    ),
  ];
}
export function importedAdapter(
  id: "overture" | "imports" | "canada",
): LeadSourceAdapter {
  const info = sourceRegistry().find((s) => s.id === id)!;
  return {
    ...info,
    async search(
      input: SearchInput,
      context: { ownerId: string; jobId: string },
    ) {
      const filters = [
        eq(businesses.ownerId, context.ownerId),
        eq(businesses.source, id),
        eq(businesses.country, input.country),
        eq(businesses.region, input.region),
        ilike(businesses.city, escapeLike(input.city)),
      ];
      if (input.product !== "domains" && input.niche !== "*")
        filters.push(
          or(
            ...nicheTerms(input.niche).map((term) =>
              ilike(businesses.niche, `%${escapeLike(term)}%`),
            ),
          )!,
        );
      if (input.product === "new") {
        if (input.since)
          filters.push(gte(businesses.registrationDate, input.since));
        if (input.until)
          filters.push(lte(businesses.registrationDate, input.until));
      }
      // Domains need the broader bounded city candidate pool, then strict matching. Never a niche-wide export.
      const rows = await getDb()
        .select({ id: businesses.id })
        .from(businesses)
        .where(and(...filters))
        .orderBy(businesses.id)
        .limit(input.product === "domains" ? 500 : input.limit);
      return { ids: rows.map((r) => r.id) };
    },
  };
}
export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}
