import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { load } from "cheerio";
import robotsParser from "robots-parser";
import { parse } from "tldts";
import { getDb } from "../lib/db";
import { businesses, jobs, sourceConfigs, jobEvents } from "../lib/db/schema";
import { GlobalCandidateDiscovery } from "../lib/discovery/providers";
import { normalizeDomain, rankDomainMatches } from "../lib/core/domain";
import { normalizeName } from "../lib/core/normalize";
import { consumeProvider } from "../lib/server/jobs";
import { safeFetch } from "./safe-fetch";
import { researchWebsite } from "./research";
import type { BusinessRecord, SearchInput } from "../lib/core/types";
// Only independently fetched, permitted first-party material enters storage.
// No SERP names, snippets, contacts, query caches or archived page content.
async function firstPartyName(url: string, hosts: string[]) {
  const origin = new URL(url);
  const robots = await safeFetch(
    new URL("/robots.txt", origin).href,
    hosts,
    256000,
  );
  if (
    robots.status !== 404 &&
    (robots.status !== 200 ||
      robotsParser(new URL("/robots.txt", origin).href, robots.body).isAllowed(
        url,
        "LeadAtlasResearch",
      ) === false)
  )
    return null;
  const crawlDelay =
    robots.status === 200
      ? Number(
          robotsParser(
            new URL("/robots.txt", origin).href,
            robots.body,
          ).getCrawlDelay("LeadAtlasResearch") ?? 1,
        )
      : 1;
  if (!Number.isFinite(crawlDelay) || crawlDelay > 10) return null;
  await new Promise((resolve) =>
    setTimeout(resolve, Math.max(1000, crawlDelay * 1000)),
  );
  const page = await safeFetch(url, hosts);
  if (page.status !== 200 || !page.contentType.includes("text/html"))
    return null;
  const $ = load(page.body);
  const names: string[] = [];
  for (const element of $("script[type='application/ld+json']")
    .toArray()
    .slice(0, 10)) {
    try {
      const root = JSON.parse($(element).text());
      const entries = Array.isArray(root)
        ? root
        : [root, ...(root["@graph"] ?? [])];
      for (const item of entries.slice(0, 30)) {
        const types = [item["@type"]].flat();
        if (
          types.some((t) =>
            /Organization|LocalBusiness|Corporation|ProfessionalService|Store|Practice|Restaurant|Service|Agency|Company/.test(
              String(t),
            ),
          ) &&
          typeof item.name === "string" &&
          typeof item.url === "string" &&
          parse(new URL(item.url, page.url).hostname).domain ===
            parse(new URL(page.url).hostname).domain
        )
          names.push(item.name);
      }
    } catch {
      /* invalid structured data never establishes identity */
    }
  }
  const siteName = $("meta[property='og:site_name']").attr("content");
  if (
    siteName &&
    normalizeName($("h1").first().text()) === normalizeName(siteName)
  )
    names.push(siteName);
  // Require explicit first-party identity, not a name guessed from the domain or SERP title.
  const name = names.find(
    (name) => name.trim().length >= 3 && name.length <= 200,
  );
  return name ? { name, delay: Math.max(1000, crawlDelay * 1000) } : null;
}
export async function discoverGlobalBusinesses(
  jobId: string,
  ownerId: string,
  input: SearchInput,
  discoveryToken?: string,
) {
  const db = getDb();
  const domains = [...new Set(input.domains ?? [input.domain!])].map(
    (d) => normalizeDomain(d).domain,
  );
  const strategy = input.domainKind ?? "auto";
  const hints = await new GlobalCandidateDiscovery().discover(
    {
      domains,
      strategy,
      professionalContext: input.professionalContext,
      filters: input.filters,
      limit: input.limit,
      queryBudget:
        input.queryBudget > 1
          ? input.queryBudget -
            Math.min(input.limit, Math.floor(input.queryBudget / 2))
          : input.queryBudget,
    },
    {
      consume: (name) => consumeProvider(ownerId, jobId, name),
    },
  );
  const [permission] = await db
    .select()
    .from(sourceConfigs)
    .where(
      and(
        eq(sourceConfigs.ownerId, ownerId),
        eq(sourceConfigs.source, "website"),
      ),
    );
  const records: BusinessRecord[] = [];
  // Supplemental licensed records from ALL regions. They are no longer the sole discovery source.
  const stems = domains.map((d) => normalizeDomain(d).stem.replace(/-/g, ""));
  const imported = await db
    .select()
    .from(businesses)
    .where(
      and(
        eq(businesses.ownerId, ownerId),
        sql`${businesses.source} IN ('imports','canada','overture')`,
        sql`regexp_replace(lower(${businesses.name}), '[^a-z0-9]', '', 'g') LIKE ANY (ARRAY[${sql.join(
          stems.map((s) => sql`${`%${s}%`}`),
          sql`, `,
        )}]::text[])`,
        input.filters?.country
          ? eq(businesses.country, input.filters.country)
          : undefined,
      ),
    )
    .orderBy(businesses.id)
    .limit(500);
  records.push(...imported.map((r) => r.record));
  let unreviewed = 0,
    failedIdentity = 0;
  for (const hint of hints) {
    if (
      (
        await db
          .select({ status: jobs.status })
          .from(jobs)
          .where(eq(jobs.id, jobId))
      )[0]?.status === "CANCELLED"
    )
      return [];
    const host = new URL(hint.url).hostname;
    if (
      !permission?.enabled ||
      !permission.policy.license ||
      !permission.policy.approvedHosts.includes(host)
    ) {
      unreviewed++;
      continue;
    }
    // Country/industry filters require sourced values. A website without them cannot claim a match.
    if (input.filters?.country || input.filters?.industry) continue;
    try {
      const hosts = permission.policy.approvedHosts;
      const identity = await firstPartyName(hint.url, hosts);
      if (!identity) {
        failedIdentity++;
        continue;
      }
      const name = identity.name;
      if (
        records.some(
          (record) =>
            normalizeName(record.name) === normalizeName(name) &&
            record.websites.some((site) => {
              try {
                return (
                  parse(new URL(site).hostname).domain === parse(host).domain
                );
              } catch {
                return false;
              }
            }),
        )
      )
        continue; // Keep the owner-authorized record; never duplicate it with a SERP-derived identity.
      const right = {
        source: "website",
        url: hint.url,
        license: permission.policy.license,
        persist: true,
        export: true,
        attribution: permission.policy.attribution,
      };
      let record: BusinessRecord = {
        id: randomUUID(),
        source: "website",
        sourceId: parse(host).domain!,
        name,
        country: "",
        region: "",
        city: "",
        niche: "",
        websites: [hint.url],
        socials: [],
        contacts: [],
        evidence: [],
        fieldRights: { name: right, website: right },
        operatingStatus: "unknown",
        importedAt: new Date().toISOString(),
        researchScope: "global",
      };
      if (!domains.some((d) => rankDomainMatches(d, [record], strategy).length))
        continue;
      await new Promise((resolve) => setTimeout(resolve, identity.delay));
      record = await researchWebsite(record, hosts, right);
      if (!record.website?.identity || !record.website.functional) {
        failedIdentity++;
        continue;
      }
      // Identity is site-specific: never merge same-name people/companies by a brand string.
      const identityKey = `global-domain:${parse(host).domain}`;
      const [current] = await db.select().from(jobs).where(eq(jobs.id, jobId));
      if (
        current.status === "CANCELLED" ||
        (discoveryToken && current.discoveryLeaseToken !== discoveryToken)
      )
        throw new Error("Discovery cancelled or lease superseded");
      const inserted = await db
        .insert(businesses)
        .values({
          id: record.id,
          ownerId,
          identityKey,
          source: record.source,
          sourceId: record.sourceId,
          name: record.name,
          country: "",
          region: "",
          city: "",
          niche: "",
          record,
        })
        .onConflictDoNothing()
        .returning();
      const existing =
        inserted[0] ??
        (
          await db
            .select()
            .from(businesses)
            .where(
              and(
                eq(businesses.ownerId, ownerId),
                eq(businesses.source, "website"),
                eq(businesses.sourceId, record.sourceId),
              ),
            )
        )[0];
      if (existing) records.push(existing.record);
    } catch {
      failedIdentity++;
    }
  }
  const matches = new Map<string, BusinessRecord>();
  for (const domain of domains)
    for (const record of rankDomainMatches(domain, records, strategy)) {
      if (
        input.filters?.industry &&
        !record.niche
          .toLowerCase()
          .includes(input.filters.industry.toLowerCase())
      )
        continue;
      if (
        !matches.has(record.id) ||
        record.domainMatch!.rank > matches.get(record.id)!.domainMatch!.rank
      )
        matches.set(record.id, record);
    }
  await db.insert(jobEvents).values({
    id: randomUUID(),
    jobId,
    stage: "GLOBAL_DISCOVERY",
    detail: `${hints.length} distinct website hints; ${unreviewed} need source permission; ${failedIdentity} could not establish website identity. Search responses are not stored. Independent activity and contact verification still required.`,
  });
  return [...matches.values()]
    .sort(
      (a, b) =>
        b.domainMatch!.rank - a.domainMatch!.rank || a.id.localeCompare(b.id),
    )
    .slice(0, input.limit);
}
