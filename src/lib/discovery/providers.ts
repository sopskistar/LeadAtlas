import { parse } from "tldts";
import { domainQueries } from "../core/domain";
import { independentWebsite } from "../core/normalize";
import type {
  CandidateDiscovery,
  DiscoveryContext,
  DiscoveryHint,
  DomainResearch,
  SearchProviderAdapter,
} from "./contracts";
async function providerJson(
  url: string,
  provider: string,
  init: RequestInit,
  context: DiscoveryContext,
) {
  // Every attempt, including a retry or a failed request, consumes quota first.
  for (let attempt = 0; attempt < 2; attempt++) {
    await context.consume(provider);
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: context.signal ?? AbortSignal.timeout(12000),
    });
    if ((response.status === 429 || response.status >= 500) && attempt === 0) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }
    if (provider === "commoncrawl" && response.status === 404) return "";
    if (!response.ok)
      throw new Error(
        `${provider} discovery unavailable (HTTP ${response.status})`,
      );
    const text = await response.text();
    if (text.length > 2_000_000)
      throw new Error("Discovery response exceeds bounded payload");
    return text;
  }
  throw new Error("Discovery unavailable");
}
export const braveAdapter: SearchProviderAdapter = {
  id: "brave",
  available: () =>
    !!process.env.BRAVE_SEARCH_API_KEY &&
    process.env.BRAVE_DISCOVERY_APPROVED === "true",
  async discover(query, context) {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", "10");
    url.searchParams.set("result_filter", "web");
    // No implicit country/city. English queries may bias coverage; they do not constrain geography.
    const data = JSON.parse(
      await providerJson(
        url.href,
        "brave",
        {
          headers: {
            "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY!,
            Accept: "application/json",
          },
        },
        context,
      ),
    );
    return (data.web?.results ?? [])
      .slice(0, 10)
      .flatMap((r: { url?: string }) =>
        typeof r.url === "string" ? [{ url: r.url, provider: "brave" }] : [],
      );
  },
};
export const dataForSeoAdapter: SearchProviderAdapter = {
  id: "dataforseo",
  available: () =>
    !!process.env.DATAFORSEO_LOGIN &&
    !!process.env.DATAFORSEO_PASSWORD &&
    process.env.DATAFORSEO_DISCOVERY_APPROVED === "true" &&
    (process.env.DATAFORSEO_LOCATION_CODES ?? "")
      .split(",")
      .filter((v) => /^\d+$/.test(v.trim())).length >= 2,
  async discover(query, context) {
    // The API requires a SERP location. The OPERATOR must choose a multi-country
    // locale rotation; this is query execution context, never a buyer-country filter.
    const codes = [
      ...new Set(
        (process.env.DATAFORSEO_LOCATION_CODES ?? "")
          .split(",")
          .map(Number)
          .filter((n) => Number.isInteger(n) && n > 0),
      ),
    ].slice(0, 8);
    if (codes.length < 2)
      throw new Error(
        "Configure at least two reviewed DataForSEO worldwide query locales",
      );
    const hints: DiscoveryHint[] = [];
    for (const location_code of codes) {
      const data = JSON.parse(
        await providerJson(
          "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
          "dataforseo",
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString("base64")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify([
              { keyword: query, location_code, language_code: "en", depth: 10 },
            ]),
          },
          context,
        ),
      );
      if (
        data.status_code !== 20000 ||
        data.tasks?.some(
          (t: { status_code: number }) => t.status_code !== 20000,
        )
      )
        throw new Error("DataForSEO task unavailable");
      for (const task of data.tasks ?? [])
        for (const result of task.result ?? [])
          for (const item of result.items ?? [])
            if (item.type === "organic" && typeof item.url === "string")
              hints.push({ url: item.url, provider: "dataforseo" });
    }
    return hints.slice(0, 80);
  },
};
export const commonCrawlAdapter: SearchProviderAdapter = {
  id: "commoncrawl",
  available: () =>
    process.env.COMMONCRAWL_DISCOVERY_APPROVED === "true" &&
    /^CC-MAIN-\d{4}-\d{2}$/.test(process.env.COMMONCRAWL_INDEX ?? ""),
  async discover(query, context) {
    // Only bounded URL-index lookups; archived content never establishes current activity or reuse rights.
    const url = new URL(
      `https://index.commoncrawl.org/${process.env.COMMONCRAWL_INDEX}-index`,
    );
    url.searchParams.set("url", query);
    url.searchParams.set("output", "json");
    url.searchParams.set("filter", "status:200");
    url.searchParams.set("collapse", "urlkey");
    url.searchParams.set("pageSize", "1");
    const text = await providerJson(url.href, "commoncrawl", {}, context);
    return text
      .trim()
      .split("\n")
      .slice(0, 20)
      .flatMap((line) => {
        try {
          const r = JSON.parse(line);
          return typeof r.url === "string"
            ? [{ url: r.url, provider: "commoncrawl" }]
            : [];
        } catch {
          return [];
        }
      });
  },
};
export const globalProviders = () => [
  braveAdapter,
  dataForSeoAdapter,
  commonCrawlAdapter,
];
export function globalDiscoveryConfigured() {
  return globalProviders().some((p) => p.available());
}
export class GlobalCandidateDiscovery implements CandidateDiscovery {
  constructor(private providers = globalProviders()) {}
  async discover(input: DomainResearch, context: DiscoveryContext) {
    const available = this.providers.filter((p) => p.available());
    if (!available.length)
      throw new Error(
        "Worldwide discovery is unavailable. No approved discovery source is configured.",
      );
    const hints: DiscoveryHint[] = [];
    const seen = new Set<string>();
    let attempts = 0,
      successes = 0;
    const plans = input.domains.flatMap((domain) =>
      available.map((provider) => ({
        domain,
        provider,
        queries:
          provider.id === "commoncrawl"
            ? ["com", "net", "org", "io", "co", "co.uk"].map(
                (tld) => `${parse(domain).domainWithoutSuffix}.${tld}/*`,
              )
            : domainQueries(domain, input.professionalContext),
      })),
    );
    // Rotate through every portfolio domain before spending on extra strategies.
    for (let round = 0; round < 6; round++)
      for (const { provider, queries } of plans) {
        const query = queries[round];
        if (!query || attempts >= input.queryBudget) continue;
        try {
          const batch = await provider.discover(query, {
            ...context,
            consume: async (name) => {
              if (attempts >= input.queryBudget)
                throw new Error("Discovery budget exhausted");
              attempts++;
              await context.consume(name);
            },
          });
          successes++;
          for (const hint of batch) {
            if (!independentWebsite(hint.url)) continue;
            const url = new URL(hint.url);
            if (
              url.username ||
              url.password ||
              !["", "80", "443"].includes(url.port)
            )
              continue;
            const key = parse(url.hostname).domain;
            if (!key || seen.has(key) || input.domains.includes(key)) continue;
            seen.add(key);
            hints.push({ provider: hint.provider, url: url.origin });
            if (hints.length >= input.limit * 4) return hints;
          }
        } catch {
          /* Another explicitly authorized adapter may still complete research. */
        }
      }
    if (!successes)
      throw new Error(
        "Worldwide discovery could not complete. Check availability and the research budget.",
      );
    return hints;
  }
}
