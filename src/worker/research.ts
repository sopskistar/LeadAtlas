import robotsParser from "robots-parser";
import { parse } from "tldts";
import { safeFetch } from "./safe-fetch";
import { extractPage } from "../lib/core/extract";
import { independentWebsite, normalizeName } from "../lib/core/normalize";
import type { BusinessRecord, Contact, FieldRight } from "../lib/core/types";
export async function researchWebsite(
  record: BusinessRecord,
  approvedHosts: string[],
  right: FieldRight,
): Promise<BusinessRecord> {
  const checkedAt = new Date().toISOString();
  const candidates = record.websites.filter(independentWebsite).slice(0, 2);
  if (!candidates.length)
    return {
      ...record,
      website: {
        status: record.socials.length ? "SOCIAL_ONLY" : "UNKNOWN",
        checkedAt,
        detail:
          "No independent website in the source; independent absence research is still required",
        identity: false,
        functional: false,
      },
    };
  let last = "Website could not be assessed";
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (!approvedHosts.includes(url.hostname)) {
        last = "Website terms/permission review required in Sources settings";
        continue;
      }
      const hosts = [
        url.hostname,
        url.hostname.startsWith("www.")
          ? url.hostname.slice(4)
          : `www.${url.hostname}`,
      ].filter((h) => approvedHosts.includes(h));
      const robots = await safeFetch(
        new URL("/robots.txt", url).href,
        hosts,
        256000,
      );
      if (
        robots.status !== 404 &&
        (robots.status !== 200 ||
          robotsParser(new URL("/robots.txt", url).href, robots.body).isAllowed(
            url.href,
            "LeadAtlasResearch",
          ) === false)
      ) {
        last = "Robots policy denies research or is unavailable";
        continue;
      }
      const policy =
        robots.status === 200
          ? robotsParser(new URL("/robots.txt", url).href, robots.body)
          : undefined;
      const delay = Math.max(
        1000,
        Number(policy?.getCrawlDelay("LeadAtlasResearch") ?? 1) * 1000,
      );
      if (delay > 10000) {
        last = "Requested crawl delay exceeds this bounded research run";
        continue;
      }
      const home = await safeFetch(url.href, hosts);
      if ([401, 403, 429].includes(home.status)) {
        last = "Access restricted or rate limited; no bypass attempted";
        continue;
      }
      if (home.status >= 400)
        return {
          ...record,
          website: {
            status: "SITE_UNREACHABLE",
            checkedAt,
            url: candidate,
            detail: `HTTP ${home.status}; this does not establish business closure`,
            identity: false,
            functional: false,
          },
        };
      const page = extractPage(home.body, record.name);
      if (page.parked)
        return {
          ...record,
          website: {
            status: "PARKED_OR_FOR_SALE",
            checkedAt,
            url: home.url,
            detail: "Parked, for-sale or host-default content",
            identity: false,
            functional: false,
          },
        };
      if (
        !home.contentType.includes("text/html") ||
        page.blocked ||
        !page.functional ||
        !normalizeName(page.text).includes(normalizeName(record.city)) ||
        /\b(directory|chamber of commerce|business listings)\b/i.test(
          page.title,
        )
      ) {
        last =
          "Content is blocked, insubstantial or lacks business/location identity and functionality evidence";
        continue;
      }
      const updated = {
        ...record,
        contacts: [...record.contacts],
        evidence: [...record.evidence],
        fieldRights: { ...record.fieldRights },
        website: {
          status: "OWNED_SITE_FOUND" as const,
          checkedAt,
          url: home.url,
          detail:
            "Business name matched title/heading; material content and navigation present",
          identity: true,
          functional: true,
        },
      };
      updated.evidence.push({
        kind: "website",
        url: home.url,
        observedAt: checkedAt,
        detail: updated.website.detail,
        source: "website",
      });
      const pages = [{ ...home, parsed: page }];
      for (const link of page.links.slice(0, 2)) {
        const target = new URL(link, home.url);
        if (
          target.hostname !== new URL(home.url).hostname ||
          policy?.isAllowed(target.href, "LeadAtlasResearch") === false
        )
          continue;
        await new Promise((resolve) => setTimeout(resolve, delay));
        try {
          const contact = await safeFetch(target.href, hosts);
          if (
            contact.status === 200 &&
            contact.contentType.includes("text/html")
          )
            pages.push({
              ...contact,
              parsed: extractPage(contact.body, record.name),
            });
        } catch {
          /* Homepage findings stay valid; missing contact surface stays unknown. */
        }
      }
      for (const item of pages) {
        const contactRight = { ...right, url: item.url };
        for (const email of item.parsed.emails) {
          const existing = updated.contacts.find((c) => c.email === email);
          const emailDomain = email.split("@")[1];
          const exactDomain =
            parse(emailDomain).domain === parse(url.hostname).domain;
          const consumer =
            /^(gmail\.com|outlook\.com|hotmail\.com|yahoo\.com)$/.test(
              emailDomain,
            ) && item.body.toLowerCase().includes(`mailto:${email}`);
          const c: Contact = {
            email,
            sourceUrl: item.url,
            foundAt: checkedAt,
            binding: exactDomain || consumer ? "EXACT_BUSINESS" : "UNCERTAIN",
            rights: contactRight,
          };
          if (existing) Object.assign(existing, c);
          else updated.contacts.push(c);
          if (c.binding === "EXACT_BUSINESS")
            updated.fieldRights.email = contactRight;
        }
        // Only explicitly dated, identity-matched material is an activity clue; page loads and copyright years aren't.
        for (const date of item.parsed.dates.slice(0, 1))
          if (item.parsed.identity)
            updated.evidence.push({
              kind: "activity",
              url: item.url,
              observedAt: new Date(date).toISOString(),
              detail:
                "Dated official business content; independent corroboration still required",
              source: "website",
              independent: false,
            });
      }
      return updated;
    } catch (error) {
      last = error instanceof Error ? error.message : "Research failed";
    }
  }
  return {
    ...record,
    website: {
      status: "REVIEW_REQUIRED",
      checkedAt,
      url: candidates[0],
      detail: last,
      identity: false,
      functional: false,
    },
  };
}
