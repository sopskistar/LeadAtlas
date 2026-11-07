# LeadAtlas product corrections — 2026-11-04

Development branch: `feature/global-domain-discovery`, based on the pushed Hallmark redesign `a33852b9524664965ffc2d257803bd6a16a8ba87`. This extends the existing Next.js application. No second checkout, reset, destructive merge, production deployment or production data change was performed.

## Recovered stopping point

The working tree was clean. The previous session had completed and pushed the custom-brand frontend redesign, with 131 unit/integration tests, 30 public browser tests, 8 authenticated browser tests and documented Hallmark/axe checks. Backend services still required live credentials and operational acceptance. Fetch revealed `origin/main` at `c1b182d` (“Add files via upload”), an empty commit with the same tree as the old base `5e22388`. It does not conflict with the redesign and was not blindly merged. Original specifications and their superseding product corrections remain preserved.

The application already provided all five product routes, auth/recovery, account/admin controls, saved research, evidence review, exports, Drizzle/Neon persistence, Inngest orchestration, a separate research worker, source restrictions and suppression. The important unfinished requirement was global domain discovery: its original form/validation and candidate pool were geographic. The city input was a datalist requiring an operator import, niches were free text and candidate limits were customer-facing.

## Frontend changes

- Approved `leadatlas-icon-v2.png` alone in shared header/sidebar/mobile/auth/footer navigation; accessible link name retained, no adjacent brand text. Original uploads remain untouched. The production copy removes transparent margins without redesigning the mark. Derived 16/32px favicons and 24/64/180/192/512px icons preserve its appearance. Dark mode retains a compact white backing for navy strokes. Metadata retains LeadAtlas.
- Existing hero headline preserved. Four independent discovery links immediately follow it in a balanced two-column grid: With Websites / Without Websites, then Domain Buyer Finder / New Business Finder. Requested descriptions and actual existing destinations retained. Mobile stacks the same source order. Lead Management & Export remains in workspace navigation.
- Searchable country/region/city controls replace native selectors/datalist on the three local research forms. Region changes clear the city and cancel stale suggestions. City browsing, server-side prefix search, 30-name pagination, keyboard selection, custom values, loading/empty/error feedback and attribution are supported.
- Searchable niche control offers canonical NAICS IDs plus common narrow business names, with custom entries always possible. A chosen alias is stored alongside its canonical identifier; changing the text clears the identifier. The server validates the pairing. Plumbing aliases search plumbing terms rather than every industry sharing a NAICS sector or code.
- Candidate/query limits are absent from primary forms. The server applies `SEARCH_INITIAL_RESULTS` / `SEARCH_QUERY_BUDGET`, the existing maximum and atomic owner/provider/job quotas. Domain discovery reserves part of its request budget for verification. Portfolio defaults allow a first strategy across domains plus bounded verification work; additional providers/locales/retries can consume that budget, so coverage remains explicitly bounded.
- Domain form is worldwide: domain or portfolio, automatic/explicit strategy, optional professional context, ownership attestation and collapsed intentional filters. No geographic fields or wildcard niche are submitted or defaulted. Personal strategy requires context.
- Domain table separates current website, relationship/reason, match state, website/activity state, public email/verification, checked date, qualification and inspect/save actions. Default domain shortlist excludes rejected records; all research remains reviewable. A strong domain relationship does not claim a qualified email or buyer intent. Small screens retain every column in a labeled, keyboard-focusable horizontal table.
- Existing light/dark/system themes, routes, controls, privacy notices and authentication wiring remain.

## References

Bundled server-only reference data contains 24,785 GeoNames names across all 64 supported regions and 1,012 six-digit 2022 Census NAICS classifications. GeoNames cities500 includes places over 500 residents and administrative seats, not every settlement. Custom entries cover omissions. The existing full-country GeoNames importer and `geo_places` table are preserved. Reproduction script, source URLs, archive hashes and attribution are in [reference provenance](../src/lib/reference/SOURCES.md). No business data is bundled or seeded into production.

## Global domain discovery

`domainSearchSchema` is separate from the local search schema. New domain jobs store `scope: "global"`; obsolete location/niche properties are stripped. Existing stored jobs are not rewritten: jobs without global scope keep their original regional path. Domains use the public-suffix-aware `tldts` parser, lowercasing and registered-domain validation. Unicode/punycode input remains a manual-review limitation.

The deterministic matcher requires company-name/domain alignment. It supports exact stems on alternative suffixes, hyphenation, bounded prefix/suffix terms, number variants and one-character spelling differences only with exact company-name support and a sufficiently long stem. Exact strategy excludes spelling guesses. Generic industry overlap, unrelated names and the seller's existing domain are excluded. Personal identities remain ambiguous; automatic detection uses a limited conservative common-name heuristic, not a comprehensive identity model. Professional context shapes research, never proves identity.

A query planner rotates bounded strategies across portfolio domains and available authorized adapters. Each provider attempt/retry consumes existing atomic quota. Results deduplicate by registered-domain hints; seller-owned portfolio domains and social/directory platforms are excluded from website candidates. Hints stay transient. No raw SERP names, snippets, contacts, archives or paid-provider caches are persisted.

Only reviewed per-owner website hosts can be independently fetched. Existing safe DNS-pinned requests, redirect restrictions, robots checks and crawl delays apply. New records need explicit first-party organization identity (same-site structured data or matching site name/heading), functional identity-matched content and a supported domain relationship. Names are not guessed from search snippets. An existing owner-authorized record for the same company/site is reused. Website-derived identities use domain-specific keys rather than merging unrelated same-name businesses. Supplemental licensed imported records are matched across countries without a hidden geographic constraint.

New website records have unknown geography/activity unless sourced. Filters with unknown country/industry are conservative exclusions. Independently corroborated activity, contact origin, exact binding, email freshness/deliverability, provenance and suppression are still required by `assess` and rechecked by CSV export. A freshly fetched homepage is insufficient activity proof. Ambiguous identities and unsupported/inactive matches cannot become qualified leads. One best target association per business is stored per portfolio job; multiple per-domain association history is future work.

## Operational source status

| Source                            | Implemented behavior                                                              | Live status / requirement                                                                                                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GeoNames / Census                 | Real public references downloaded and processed                                   | Operational for suggestions; attribution retained                                                                                                                                    |
| Brave Search                      | Real API adapter, bounded exact-name queries, retries, transient URLs             | Not live-tested; key and `BRAVE_DISCOVERY_APPROVED=true` after terms review                                                                                                          |
| DataForSEO Google organic         | Real official API adapter, HTTP Basic auth, validated task status, depth 10       | Not live-tested; credentials, approval and at least two operator-selected country-level location codes. Locale-biased SERPs are combined; they are not worldwide coverage guarantees |
| Common Crawl                      | Real pinned CDX URL-index adapter, bounded alternative-extension lookups          | Not live-tested; explicit approval and `COMMONCRAWL_INDEX`. Historical hints only; six supported suffix patterns do not cover every TLD                                              |
| Business websites                 | Existing safe fetch/robots research plus first-party identity extraction          | Requires per-workspace approved hosts, reviewed licence/attribution; no blanket scraping permission                                                                                  |
| Authorized directories/registries | Existing licensed import adapter extended to global country records for `imports` | No arbitrary live registry/directory API claimed. CA federal/Overture local import restrictions retained                                                                             |
| Hunter                            | Existing sourced public contact discovery and verification                        | Keys/reuse approval and live acceptance still required; no verification fabricated                                                                                                   |
| Professional data / LinkedIn      | Typed extension boundary; existing restrictions retained                          | No new live integration and no unauthorized scraping                                                                                                                                 |

Brave docs: https://api-dashboard.search.brave.com/documentation/services/web-search. DataForSEO contract: https://docs.dataforseo.com/v3/serp/google/organic/live/advanced/. Common Crawl index documentation: https://index.commoncrawl.org/. Credentials do not automatically grant contact storage/export rights. No paid provider was activated or contacted for acceptance testing.

## Durable execution and release

Global discovery can exceed a web request. Additive migration `0003_global_discovery_lease` adds two nullable lease fields to `search_jobs`, without rewriting existing records. The worker starts discovery in the background and immediately returns a polling state. A 90-second lease renews every 25 seconds; durable Inngest polls every 5 seconds. Final candidate writes are fenced against cancellation/superseded leases. Crashed tasks can resume after expiry; failures remain explicit and quotas are not reset. Existing enrichment item leases, completed-item idempotency and owner isolation remain intact. No raw discovery hints are retained for recovery; a crash may require budgeted queries again.

Apply migration in staging before deploying the paired web and worker versions. Use the same provider flags/credentials where status is calculated and requests are executed. Validate real Neon, worker restart/lease recovery, Inngest cancellation/resume and reviewed provider contracts before release. Local fixture checks do not establish production infrastructure readiness.

## Optional Otari-compatible explanation

Current official Otari documentation describes a self-hosted OpenAI-compatible gateway with `/api/v1/chat/completions` and `base_url` ending in `/api/v1`: https://github.com/mozilla-ai/otari. It is not a business-discovery source or independent verification engine. Its optional tools are not connected by LeadAtlas.

`optionalResearchExplainer()` is a server-side, disabled-by-default adapter behind `ResearchExplainer`. To experiment later, set `RESEARCH_AI_ENABLED=true`, `RESEARCH_AI_BASE_URL=https://your-trusted-gateway/api/v1`, `RESEARCH_AI_MODEL` and `RESEARCH_AI_API_KEY` on the server. Keep keys private; use operator-approved gateway budgets. No provider/model is deployed or enabled by this change. The deterministic pipeline never invokes or requires this adapter.

The adapter receives at most 20 bounded sourced evidence items, instructs the model to treat them as untrusted data, requires valid source indexes, limits output/time and returns an explicitly untrusted draft. Citation validation cannot prove a model's prose correct. Human review is mandatory; AI output cannot change businesses, contacts, verification, qualification or buying intent. No automatic customer-facing AI explanation action is exposed.

## Validation and visuals

See the final execution record below and [before/after comparison](screenshots/corrections/compare.html). Hallmark uses the locked custom-brand system, with in-thread reviews as required by its Codex harness. Tests intentionally use fictional businesses/domains, simulated provider responses and an isolated PostgreSQL account; fixture records are never exportable. No live discoveries are presented as real prospects.

Remaining acceptance includes real provider responses/rights, complete multi-locale/multilingual coverage, independent activity/identity corroboration feeds, professional disambiguation, production load/recovery and inbox deliverability. Empty/review states are expected until sufficient permitted evidence exists. No buying probabilities, fabricated metrics or claim of expressed purchase intent is introduced.

## Final execution record

- `npm run lint`, `npm run typecheck`, `npm run build`: **PASS**.
- `npm test`: **159 passed in 13 files**.
- Public production Playwright: **38 cases completed**, 37 passed first attempt and one city-suggestion assertion passed on retry during concurrent browser/audit load. The unchanged geography test was then run separately on desktop and mobile with `--retries=0`: **2 passed**. This timing observation is retained rather than hidden.
- Authenticated production Playwright: **10 passed**, using real Better Auth and migrated isolated PostgreSQL with explicitly fictional, nonexportable fixtures. Domain table tests cover eight widths, mobile viewport containment, horizontal keyboard scrolling, actual pointer access to Inspect and focus return.
- All configured axe checks passed in light and dark themes. Hallmark final rendered preservation audit: **0 Floor failures, 0 Reflex findings, 0 warnings** over four URLs, with 20 audit screenshots. In-thread visual review confirmed the final four-card homepage, icon sizes and corrected domain table/evidence layouts.
- Existing records, original uploads and migrations were preserved. New source fixtures are tests only. Keys, provider approvals, real discoveries and production deployment are not fabricated or claimed.

The final homepage section contains four product cards only. Lead Management & Export remains in the workspace. The final section-only refinement changed its copy and supporting styles; it did not restructure unrelated homepage sections.

Execution details are in `.hallmark/product-corrections-validation.json`; the changed-file manifest is [PRODUCT_CORRECTION_FILES.txt](PRODUCT_CORRECTION_FILES.txt). Deploy the pushed development branch using the migration and paired-worker steps in [DEPLOYMENT](DEPLOYMENT.md).
