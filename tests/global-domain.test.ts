import { describe, it, expect, vi, afterEach } from "vitest";
import { business, NOW } from "./fixtures/business";
import {
  domainQueries,
  normalizeDomain,
  rankDomainMatches,
  matchDomain,
  domainMatchStatus,
} from "../src/lib/core/domain";
import { domainSearchSchema } from "../src/lib/core/validation";
import { assess } from "../src/lib/core/quality";
import { suppressMailboxes } from "../src/lib/core/suppression";
import {
  GlobalCandidateDiscovery,
  braveAdapter,
  dataForSeoAdapter,
  globalDiscoveryConfigured,
} from "../src/lib/discovery/providers";
import { optionalResearchExplainer } from "../src/lib/discovery/ai";
// Fictional domain/name relationships only. No live prospects or provider calls.
const target = "novalithfixture.com";
const candidate = (site: string, extra = {}) =>
  business({
    name: "Novalith Fixture",
    websites: [`https://${site}`],
    ...extra,
  });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("global domain contract and deterministic relationships", () => {
  it("needs no geographic or industry fields and removes obsolete defaults", () => {
    const parsed = domainSearchSchema.parse({
      product: "domains",
      domain: ` ${target.toUpperCase()} `,
      ownershipAffirmed: true,
      country: "US",
      region: "NY",
      city: "New York",
      niche: "*",
    });
    expect(parsed).toMatchObject({
      scope: "global",
      domain: target,
      domainKind: "auto",
      limit: 10,
    });
    for (const key of ["country", "region", "city", "niche"])
      expect(parsed).not.toHaveProperty(key);
    expect(normalizeDomain("novalithfixture.co.uk").extension).toBe("co.uk");
    expect(
      domainSearchSchema.safeParse({
        product: "domains",
        domain: target,
        ownershipAffirmed: true,
        domainKind: "personal",
      }).success,
    ).toBe(false);
  });
  it("ranks worldwide exact, prefix/suffix, hyphen, number, and bounded typo relationships", () => {
    const records = [
      candidate("getnovalithfixture.example", { country: "AU" }),
      candidate("novalithfixture.example", { country: "DE" }),
      candidate("novalith-fixture.example", { country: "JP" }),
      candidate("novalithfixturegroup.example", { country: "GB" }),
      candidate("novalithfixture24.example", { country: "NZ" }),
      candidate("novalithfixtur.example", { country: "CA" }),
    ];
    const matches = rankDomainMatches(target, records, "brandable");
    expect(matches).toHaveLength(6);
    expect(matches[0].domainMatch!.rank).toBe(3);
    expect(matches.map((r) => r.domainMatch!.tier)).toEqual(
      expect.arrayContaining([
        "EXACT_STEM_DIFFERENT_TLD",
        "HYPHENATED",
        "PREFIX_SUFFIX",
        "NUMBER_VARIATION",
        "CONFIRMED_SHORT_VARIATION",
      ]),
    );
  });
  it("rejects unrelated brands, generic terms, existing ownership and broad fuzziness", () => {
    expect(
      matchDomain(
        "plumberfixture.com",
        business({
          name: "Different Plumbing",
          websites: ["https://differentplumbing.example"],
        }),
        "exact",
      ),
    ).toBeUndefined();
    expect(
      matchDomain(
        target,
        candidate("novalithfixture.example", { name: "Unrelated Company" }),
        "brandable",
      ),
    ).toBeUndefined();
    expect(matchDomain(target, candidate(target), "brandable")).toBeUndefined();
    expect(
      matchDomain(
        target,
        candidate("novalithfixtur.example", { name: "Novalith Fixtur" }),
        "brandable",
      ),
    ).toBeUndefined();
    expect(
      matchDomain(target, candidate("novalithfixtur.example"), "exact"),
    ).toBeUndefined();
  });
  it("keeps personal identity ambiguous and never claims buying intent", () => {
    const match = matchDomain(
      "janesmithfixture.com",
      business({
        name: "Jane Smith Fixture",
        websites: ["https://janesmithfixture.example"],
      }),
      "personal",
    )!;
    expect(match.ambiguous).toBe(true);
    expect(match.reasons.join(" ")).toContain("no evidence of buying intent");
    expect(
      domainMatchStatus(
        candidate("novalithfixture.example", { domainMatch: match }),
      ),
    ).toBe("NEEDS_REVIEW");
  });
  it("recognizes bounded professional-domain suffixes while retaining personal review", () => {
    const record = business({
      name: "Jane Smith Fixture",
      websites: ["https://janesmithfixturelaw.example"],
    });
    const match = matchDomain("janesmithfixture.com", record, "personal");
    expect(match?.tier).toBe("PREFIX_SUFFIX");
    expect(match?.ambiguous).toBe(true);
  });
  it("requires functional site identity, independent activity, verification and suppression gates", () => {
    const record = candidate("novalithfixture.example", { fixture: false });
    record.domainMatch = matchDomain(target, record, "brandable");
    expect(assess(record, "domains", NOW).status).toBe("QUALIFIED");
    expect(
      assess(
        { ...record, website: { ...record.website!, identity: false } },
        "domains",
        NOW,
      ).status,
    ).toBe("NEEDS_REVIEW");
    expect(
      assess(
        { ...record, evidence: record.evidence.filter((e) => !e.independent) },
        "domains",
        NOW,
      ).status,
    ).toBe("NEEDS_REVIEW");
    expect(assess({ ...record, contacts: [] }, "domains", NOW).status).not.toBe(
      "QUALIFIED",
    );
    const suppressed = suppressMailboxes(
      record,
      new Set([record.contacts[0].email]),
    );
    expect(assess(suppressed, "domains", NOW).status).not.toBe("QUALIFIED");
  });
});
describe("authorized global discovery adapters", () => {
  it("is honestly unavailable without credentials and approval", async () => {
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "");
    vi.stubEnv("DATAFORSEO_LOGIN", "");
    vi.stubEnv("COMMONCRAWL_DISCOVERY_APPROVED", "false");
    expect(globalDiscoveryConfigured()).toBe(false);
    await expect(
      new GlobalCandidateDiscovery().discover(
        { domains: [target], strategy: "auto", limit: 10, queryBudget: 5 },
        { consume: vi.fn() },
      ),
    ).rejects.toThrow("unavailable");
  });
  it("deduplicates global URLs, excludes seller/platform sites, and respects request budgets", async () => {
    let calls = 0;
    const consume = vi.fn(async () => {});
    const provider = {
      id: "fixture",
      available: () => true,
      discover: vi.fn(
        async (_q: string, ctx: { consume: (id: string) => Promise<void> }) => {
          await ctx.consume("fixture");
          calls++;
          return [
            {
              url: "https://novalithfixture.example/about",
              provider: "fixture",
            },
            {
              url: "https://novalithfixture.example/contact",
              provider: "fixture",
            },
            { url: `https://${target}`, provider: "fixture" },
            {
              url: "https://linkedin.com/company/fixture",
              provider: "fixture",
            },
          ];
        },
      ),
    };
    const result = await new GlobalCandidateDiscovery([provider]).discover(
      { domains: [target], strategy: "auto", limit: 10, queryBudget: 2 },
      { consume },
    );
    expect(result).toEqual([
      { url: "https://novalithfixture.example", provider: "fixture" },
    ]);
    expect(calls).toBe(2);
    expect(consume).toHaveBeenCalledTimes(2);
    expect(domainQueries(target).join(" ")).not.toMatch(
      /New York|United States/,
    );
  });
  it("charges every Brave retry and supplies no hidden country", async () => {
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "test-only");
    const consume = vi.fn(async () => {});
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(
        Response.json({
          web: { results: [{ url: "https://novalithfixture.example" }] },
        }),
      );
    vi.stubGlobal("fetch", fetch);
    const result = await braveAdapter.discover('"novalithfixture"', {
      consume,
    });
    expect(consume).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
    expect(new URL(fetch.mock.calls[0][0]).searchParams.has("country")).toBe(
      false,
    );
  });
  it("requires operator-selected multi-country DataForSEO locales", async () => {
    vi.stubEnv("DATAFORSEO_LOCATION_CODES", "");
    await expect(
      dataForSeoAdapter.discover("fixture", { consume: vi.fn() }),
    ).rejects.toThrow("at least two");
  });
  it("leaves AI off and rejects unsupported source citations", async () => {
    vi.stubEnv("RESEARCH_AI_ENABLED", "false");
    expect(optionalResearchExplainer()).toBeNull();
    vi.stubEnv("RESEARCH_AI_ENABLED", "true");
    vi.stubEnv("RESEARCH_AI_BASE_URL", "https://gateway.example/api/v1");
    vi.stubEnv("RESEARCH_AI_MODEL", "fixture");
    vi.stubEnv("RESEARCH_AI_API_KEY", "test-only");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  text: "Untrusted draft",
                  evidenceIndexes: [8],
                }),
              },
            },
          ],
        }),
      ),
    );
    await expect(
      optionalResearchExplainer()!.explain([
        {
          url: "https://fixture.example",
          detail: "Fixture only",
          observedAt: NOW.toISOString(),
        },
      ]),
    ).rejects.toThrow("valid source references");
  });
});
