# LeadAtlas live foundation build status

Updated: 2026-11-18 America/New_York
Branch: `release/leadatlas-live-foundation`
Starting revision: `2ae1f29` (`origin/main` at inspection)

## Release delivery checkpoint

- `e48705f` was pushed to `origin/release/leadatlas-live-foundation` on Nov 18, 2026. It has not been merged to `main` or deployed.
- The installed Next.js 16.4.3 security gate still causes `npm run build` to exit nonzero. An attempted upgrade to 16.4.6 could not complete because the npm registry request timed out and the offline cache lacked `eslint-config-next` metadata; package manifests and lockfile remain unchanged.
- GitHub CLI could not connect to `api.github.com`, and no authenticated Vercel deployment path is available in this workspace. Do not promote this revision until the patched dependency upgrade, production build, CI, and staging acceptance pass.

## Goal

Prepare the existing LeadAtlas foundation for personal use by the Friday, November 20 target. Preserve the approved frontend and existing product/backend contracts. Real external acceptance work must use real staging services and authorized records; automated fixtures are never evidence of a live integration.

## Baseline recovered

- Local `main`, `origin/main` and the new release branch started at `2ae1f29`; the working tree was clean. `git fetch origin` confirmed the same current revision.
- Existing migrations `0000` through `0005` are present. No migration has been applied in this session. Production must never be used as a staging target.
- `.env`, `.env.local`, and `.env.staging` are absent. No provider values were printed or inspected. Vercel and Inngest CLIs, `psql`, and direct Neon/Vercel/Inngest/Resend account connectors are unavailable in this workspace. Docker is installed, but no staging image or credentials are configured.
- Public read-only check of `https://www.leadatlas.xyz/api/status` on Nov 18 returned `auth=false`, `registration=false`, `recovery=false`, `domainSearch=false`, `search=false`. This is direct production evidence that account and search services are not enabled at the time of the check; it does not identify the missing individual setting.
- Production `/robots.txt` and `/sitemap.xml` currently return the application HTML fallback rather than their respective text/XML documents. The apex redirects to `www`. An initial apex homepage request timed out once; this does not establish a site outage because the canonical API and fallback paths responded afterward.
- Source code provides Better Auth, Resend, Drizzle/Neon, Inngest, signed worker RPC, bounded local research, Overture/import source contracts, global domain adapters, Hunter verification, per-owner job budgets, provider daily request counters, tenant-scoped saved leads/tags, suppression and qualified export. Code presence and fixture tests do not establish production connectivity.

## Operational state at baseline

| Area | Code status | Local/live evidence |
| --- | --- | --- |
| Neon/PostgreSQL | Drizzle schema and migrations 0000–0005; migration runner present | No local connection values; no staging connection or migration run performed |
| Vercel | Next.js application and `vercel.json` present | Production API status reachable; Vercel account/commit dashboard unavailable, deployed SHA not independently proven |
| Better Auth | Registration/session/recovery and database-backed throttling implemented | Production reports auth unavailable; no real account journey run |
| Resend | Transactional auth integration present | No credentials/sender verification; no inbox delivery run |
| Admin access | `ADMIN_USER_IDS` gate and server-side admin route/API checks implemented | No founder account ID or deployed admin verification |
| Inngest | Durable workflow and retries/cancel/polling code present | Production reports search unavailable; no event keys or live dispatch evidence |
| Node worker | Signed worker service, leases and health route present | No worker URL/secret or deployed worker verification |
| Business discovery | Source registry, permitted imports/Overture and URL enrichment paths present; external map/social providers remain restricted | No authorized account dataset available in this workspace; no live candidate run |
| Domain Buyer Finder | Separate worldwide matching and Brave/DataForSEO/Common Crawl adapters present | Production reports domain search unavailable; no keys/approval or owned domain supplied; no live discovery |
| Website/contact checks | Bounded safe-fetch and evidence pipeline present | Fixture-tested only here; no permitted live business record run |
| Hunter | Email verifier maps invalid/catch-all/unknown states conservatively; HTTP 202 stays unverified | No API key/live provider response; 202 revalidation is documented as pending work, not operational |
| Leads/tags/export | Tenant-owned saved leads, notes/tags, suppression and qualified CSV code present | Fixture-tested in repository; no real saved/exported lead acceptance evidence |
| Spending limits | Owner daily/monthly work reservations, per-job budgets, provider daily/monthly request counters, global/user API windows, hourly search cap, and atomic provider maximum-cost reservations | Defaults fail paid work closed. Local tests exercise reservations and rate windows; no live vendor billing caps or invoice reconciliation verified |

## Completed in this branch

- Repository and documentation baseline inspected; Next.js 16.4.3 local Route Handler and metadata guides read before application code changes.
- Release branch created from current `origin/main`.
- Public production availability and missing robots/sitemap behavior checked without accessing credentials.
- Implemented atomic, Postgres-backed global and per-user API request windows, public endpoint limits, and an hourly per-user search-start cap, including global limiting for Better Auth route requests. When no database URL exists for local preview, low-risk public lookups use a bounded process-local limiter; configured deployments fail closed if shared limit storage fails. Better Auth continues to enforce its own auth throttles.
- Added monthly per-owner search-work budgets and monthly per-provider request quotas. Paid provider calls now fail closed until a global daily cap, monthly cap, and provider-specific maximum per-call cost are all configured. Search-provider requests reserve cost in the same transaction as request quotas; transactional Resend requests reserve against the same global and provider caps before sending. These are conservative reservations, not a provider invoice ledger. Defaults are zero. SQL integer-backed monthly spend is capped at $2,000.
- Admin source readiness now identifies missing spend-budget configuration separately from missing credentials. `/admin/sources` displays daily/monthly reserved spend and a visible warning at 80%; provider hard billing caps still need to be set at each vendor.
- Hunter, Brave and DataForSEO discovery are not marked configured/usable without spend caps; global Brave/DataForSEO adapters also require credentials and explicit approval. Resend auth and consented-update sending now reserve the shared global/provider budget as well. No paid provider was enabled in production.
- Added page-specific descriptions and private indexing metadata for workspace/auth routes, an Open Graph image route, `robots.txt` and a public-only sitemap. The custom 404 and existing icon set were retained. Added the `AI Receptionist Prospect` display label while retaining the established internal tag key and data contract.
- Added `.env.example` entries and tests for rate windows, fail-closed spend setup, atomic maximum-cost reservations for search and Resend, and admin near-cap warnings.
- Initial operational inventory recorded above.

## In progress

- Resolve the Next.js dependency security gate described below before treating the production build as passing.
- Obtain staging credentials and perform live external service/lead acceptance; current production status still reports all account/search flags false.

## Blocked on owner-controlled external setup

1. Create a Neon staging project/branch and provide pooled `DATABASE_URL` plus direct `DIRECT_URL` through the approved secure secret mechanism. Validate the database identity/branch before migration; then apply only unapplied migrations 0000–0005.
2. Provide a staging Better Auth secret/origin, verified Resend sender/API key, and founder account workflow. Add the verified founder user ID to staging `ADMIN_USER_IDS`.
3. Configure staging Inngest event/signing keys and deploy the separate Node worker with a 32+ character `WORKER_SECRET`; point `WORKER_URL` to its HTTPS endpoint.
4. Provision a reviewed Overture or licensed directory slice in the founder-owned staging workspace, including source manifest and allowed website hosts.
5. Provide permitted Hunter credentials and an authorized real test contact; no test email should be sent.
6. Approve/set up at least one worldwide search provider (Brave or DataForSEO) and a domain actually owned by the user for domain buyer acceptance. Confirm allowed use, retention/export rights, provider-side hard spend cap and locales before enabling.
7. For production audit/release, provide Vercel read access or CLI login and confirm production deployment SHA, domain settings, environment split, monitoring, backups and database migration owner.
8. Review and approve a Next.js security dependency upgrade in a reviewable worktree. The current `next@16.4.3` causes the production build to compile and type-check but exit with `SecurityFatalError`; the official Next.js release feed shows `16.4.6` on Nov 9 and the Nov 3 security release includes fixes. No framework upgrade has been applied in this branch.

## Exact next actions

1. Resolve the Next.js `16.4.3` security gate on a reviewable dependency-upgrade branch/worktree and rerun the production build plus regression suite.
2. Create an isolated Neon staging branch and securely supply its pooled/direct URLs; confirm database identity and apply only outstanding migrations.
3. Configure the staging Better Auth/Resend/Inngest/worker accounts, admin ID, vendor credentials, provider permissions, conservative cost reservations and provider-side hard caps.
4. Provide a permitted Overture/directory slice, a real authorized Hunter test contact and a domain actually owned by the user; execute and document both complete acceptance journeys with genuine responses.
5. Promote only after staging passes and the deployed code/environment are explicitly verified. Production is not approved by these fixture/browser tests.

## Current validation

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 182 tests passed across 15 files, including Resend spend reservation. Deterministic fixtures only; not live-provider evidence.
- `npm run test:e2e`: 56 desktop/mobile Playwright tests passed on the latest compiled application, including responsive, theme, source selector, navigation, accessibility, and form states. The initial run had six environment-dependent failures because the production-mode preview had no `DATABASE_URL`; after adding bounded process-local limits only for the no-database low-risk lookup preview, focused rerun passed and the full suite passed. These tests do not establish authenticated live database/provider acceptance.
- `npm run build`: optimized compile, TypeScript, route generation and trace collection complete, but Next.js exits nonzero at its built-in `SecurityFatalError` for the installed `16.4.3`. Retrying as instructed returned the same gate. Production build status is therefore **blocked**, not passed.
- `git diff --check`: passed after the implementation and documentation changes.
- No real database, email, Inngest, worker, paid provider, Hunter, or lead-journey acceptance test has been run in this session.

## Production audit disposition

1. Custom 404 page: already present.
2. Primary CTA above the fold: existing browser suite passes; no layout changes made.
3–4. Page titles and descriptions: existing titles retained; descriptions added for public/auth/workspace routes.
5. Open Graph image: added using the existing LeadAtlas positioning and restrained brand colors.
6. Favicon/app icons: existing approved icon assets retained; present in public asset tree.
7–8. Robots/sitemap and image alternatives: added robots and public-only sitemap routes; current app `<Image>` usage has accessible or intentionally empty decorative alt text.
9. Loading/empty/success/error states: existing UI coverage retained; browser tests passed.
10. Privacy policy: present and describes data flows, but operator legal identity, contact details, retention schedule and regional disclosures remain required before public commercial launch.
11–12. Analytics/privacy and request budgets: no analytics package or analytics tracking is installed. App-side request and spend reservations are added; provider-side hard caps remain owner setup.
13. Rate limits/spend controls: atomic shared database limits are implemented for configured environments; search, provider and paid-call caps are bounded and paid calls default closed. Optional AI has no public endpoint and is not invoked by the workflow.
