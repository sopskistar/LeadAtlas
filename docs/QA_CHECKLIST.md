# QA record and outstanding acceptance checks

This file distinguishes executed checks from external integration acceptance. Passing deterministic tests does not establish live data accuracy, production deployment, Meta approval or commercial reuse rights.

## Customer experience revision — 2026-10-30

This revision resumes a clean local `main` at `d502635`, fast-forwarded to `5c5ae85` after confirming that the only remote addition was the complete UI/UX revision specification. There were no staged, unstaged or untracked changes to recover. The prior implementation, all three migrations, samples, qualification logic, worker and tests were retained.

- Unit/integration suite: **131 passed across 11 files**, using actual Better Auth and migrated PGlite SQL plus explicitly labeled provider fixtures. New checks include anonymous/customer/admin page access, admin-only cross-workspace provisioning, reset expiry, concurrent single-use enforcement, password policy, session revocation, old-password rejection, safe email origin, identical unknown-account/provider-failure responses, database-backed recovery throttling, and a slow-provider check proving recovery responses do not wait for mail delivery.
- Lint and strict TypeScript: **PASS** for the revised sources and tests.
- Production build: **PASS**, including the development-only CSP fix and branded error pages.
- Targeted desktop/mobile auth and axe WCAG checks: **8 passed** after fixing footer contrast and scoping form-alert assertions around Next.js’s separate route announcer.
- Final Playwright run: **26 passed** against the final production build, including axe checks in both themes after the authentication background-lifetime refinement. Checks cover themes/persistence/system changes, mobile focus and navigation, public/admin boundaries, all finder forms, recovery states, synthetic tour and responsive screenshots at 320/360/375/390/430/768/1024/1440 pixels.
- Production browser checks found no horizontal overflow, uncaught errors or hydration warnings across the eight tested widths; the search form also passed at 200% zoom. A separate development run reproduced React’s eval/CSP warning and the red issue indicator; the documented development-only CSP allowance removed both. A repeat Chromium check on homepage, finder and signup returned HTTP 200 with no console errors or issue indicator. Production CSP continues to exclude unsafe-eval.
- Pre-revision Vercel homepage: **HTTP 200**, visually inspected in Chromium; public status reported `auth=false`, `database=false`, `orchestration=false`, `verifier=false`. Live Neon, Hunter, Inngest/worker and Resend delivery tests remain **UNTESTED**. These booleans are configuration signals, not successful connectivity checks.
- Before/after homepage screenshots: [desktop before](screenshots/revision/before-desktop.png), [mobile before](screenshots/revision/before-mobile.png), [desktop light](screenshots/revision/after-desktop-light.png), [desktop dark](screenshots/revision/after-desktop-dark.png), [mobile light](screenshots/revision/after-mobile-light.png), [mobile dark](screenshots/revision/after-mobile-dark.png). The inherited site had no theme control, so before screenshots show its actual light appearance. Additional search/workspace/auth screenshots are generated under ignored `test-results/`.

## Inherited validation record (prior session; not a substitute for the checks above)

| Check                | Result                           | Scope                                                                                            |
| -------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run lint`       | PASS                             | ESLint application, worker, scripts and tests                                                    |
| `npm run typecheck`  | PASS                             | Strict TypeScript across app/backend/worker/tests                                                |
| `npm test`           | PASS: 118 tests, 9 files         | Deterministic unit + real SQL/auth integration tests                                             |
| `npm run build`      | PASS                             | Optimized Next.js production build with static/dynamic/API route compilation                     |
| `npm run test:e2e`   | PASS: 12 tests                   | Desktop + mobile Chromium, real production build, missing-credential states and responsive forms |
| `npm audit --json`   | PASS: 0 reported vulnerabilities | Patched CSV parser, compatible Zod/esbuild overrides and OpenTelemetry peer alignment            |
| Versioned migrations | PASS in PGlite                   | All three SQL migrations applied before integration tests; Neon not connected                    |
| Python compilation   | PASS                             | Overture extractor + Canada normalizer syntax; no claim of live Canada ingestion                 |
| `git diff --check`   | PASS                             | Whitespace validation                                                                            |

The restricted sandbox prevented Next.js from capturing TypeScript subprocess output and prevented the Playwright application server from starting. Build/browser checks were rerun with the approved execution permissions and passed. The checks were not skipped or disabled. Browser traces captured initial form-label failures; the corrected desktop/mobile suite passed. Screenshots in ignored `test-results/workspace-desktop.png` and `workspace-mobile.png` were visually inspected.

## Meaningful automated coverage

- Actual Better Auth signup/session, hashed password storage, unauthenticated API rejection, mutation-origin checks, source-administrator enforcement and cross-tenant read/write rejection.
- Persisted permission-confirmed import → source filtering → job/idempotency reservation → safe worker website/email enrichment using fixture transports → actual SQL result/evidence storage → qualified CSV → saved lead → suppression → re-export exclusion.
- Separate social-only licensed-email path with two documented absence checks; no blank-URL inference. Canada federal incorporation date filters leave business activity unknown. Strict persisted domain matching finds the prefixed brand candidate.
- Closed/temporarily closed/conflicting/stale/unknown businesses, parked/broken/blocked/mismatched sites, missing/uncertain contacts, missing keys, invalid MX, transient DNS errors, catch-all/disposable/unknown/blocked/no-processing verifier responses and actual provider date retention.
- Test/demo export exclusion, exact two-column CSV, quoting/formula protection, duplicate normalization, shared franchise-domain separation, field/contact-specific source rights, and suppression of an opted-out/bounced mailbox across distinct owner business records.
- Exact/prefix/suffix/confirmed-typo name/domain matching, EMD broad-industry exclusion, personal-name ambiguity, seller-domain exclusion and unsafe Unicode/punycode/subdomain input handling.
- All 51 US state/DC and 13 Canadian province/territory choices; both US and Canadian location validation; arbitrary niche/city fields.
- HMAC tamper/expiry rejection, private/reserved/mapped IP blocking, validated DNS pinning, mixed public/private DNS rejection, unapproved redirect hosts, compressed/oversized body rejection and script-only email exclusion.
- Budget rollback, provider query limits, idempotent completed work, persisted cancellation, expired worker lease reclaim and fencing-token protection against a superseded worker changing the new lease or double-counting completion.
- Google/Meta restrictions with explicit permissions, Google ID-only field mask, restricted API fixture failures, transient Brave clues and Hunter sourced enrichment that rejects inferred, personal, stale or unrelated-source contacts.

All provider responses in automated tests are explicitly fixtures. The integration database is a disposable PostgreSQL-compatible PGlite instance, not a mocked repository and not Neon staging. Browser smoke tests intentionally run without external secrets and do not claim the authenticated live-provider browser journey passed.

## Live public Overture attempt

The extractor reached the public `2026-10-21.0` S3 release. DuckDB 2.0.0 failed with an internal nested-Parquet-filter type assertion, so the extraction runtime is pinned to 1.4.3. The first NYC `plumber` predicate returned no candidates. Inspection showed the actual category is `plumbing`; a linguistic `plumb` alias fixed the query. The corrected live runs returned **4 accepted New York records** (one Bronx locality excluded) and **5 accepted Toronto records**. Actual GERS IDs, source timestamps, per-record license IDs, manifests, licence texts and notices are preserved under `samples/overture-2026-10-21.0/`.

These are genuine licensed discovery samples, **not independently verified businesses/emails**. They have no vendor verification and are not qualified leads. No Neon records were created because credentials were absent. Operator manifest review remains required. The complete real-sample → Neon → live verification acceptance test is therefore **NOT PASSED**.

## External integration reproduction and blockers

| Integration                               | Status                                                        | Required reproduction                                                                                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Neon                                      | UNTESTED LIVE; no URL supplied                                | Create staging branch; set DATABASE_URL/DIRECT_URL; run migrations; create account; inspect owner-scoped records and backups                                                         |
| Inngest Cloud                             | UNTESTED LIVE; keys absent                                    | Set event/signing keys; sync `/api/inngest`; run real job; close browser; verify persisted steps/cancellation/retry                                                                  |
| Deployed worker / horizontal recovery     | UNTESTED LIVE; host/secret absent                             | Build Dockerfile.worker; deploy HTTPS service; set shared secret; reject unsigned calls; restart a replica mid-item and verify lease reclaim without duplicate completion            |
| Hunter verifier                           | UNTESTED LIVE; key absent                                     | Use an authorized known public business contact; verify actual native state and actual date; test pending/quota/missing-key behavior; confirm invalid/catch-all contacts export zero |
| Hunter Domain Search                      | UNTESTED LIVE; key/reuse approval absent                      | Set HUNTER_REUSE_APPROVED only after terms review; research an identity-matched permitted domain; keep only generic, found, current first-party evidence; verify separately          |
| Brave                                     | UNTESTED LIVE; key absent                                     | Set key and job request budget; allow a reviewed business host; confirm no raw result/snippet retention and no official-site claim without independent fetch                         |
| Facebook Pages                            | RESTRICTED, UNTESTED LIVE                                     | Verify current Meta app permissions, approved PPCA/use case and Graph version; configure approval flag/token; test known Page ID; do not enable lead exports based on token success  |
| Instagram professional Business Discovery | RESTRICTED, UNTESTED LIVE                                     | Verify professional account and approved permissions; set account ID and approval flag; test known public professional username; no city/niche email harvest                         |
| Google Places (New)                       | RESTRICTED, UNTESTED LIVE                                     | Review use/attribution terms; configure key/approval; budgeted ID-only lookup; ensure no Google fields enter lead storage/CSV                                                        |
| Canada federal dataset                    | NORMALIZER/IMPORT TESTED WITH FIXTURES; LIVE RELEASE UNTESTED | Download current official dataset; inspect format; provide actual column mapping and license; normalize recent dates; import bounded records; independently enrich contacts/activity |
| GeoNames                                  | IMPORTER IMPLEMENTED; LIVE FILE IMPORT UNTESTED               | Download US/CA files under CC BY; run streaming populated-place import; inspect attribution and province mapping; verify suggestions without claiming business coverage              |
| Vercel, domain/DNS                        | PREVIEW REACHABLE; CUSTOM DOMAIN UNVERIFIED                   | Connect authorized project, configure secrets, deploy worker and Inngest first, then Vercel; use Vercel’s returned DNS values                                                        |

## Product/operational acceptance still open

- Resend verification/password-reset integration is now implemented; real credentials, sender verification and live delivery still require operator validation. Operator-specific legal identity/privacy contact remains missing. Complete these before public signup/paid launch.
- No automatic Hunter 202 polling, global buyer discovery, full Canada bulk/API format support, 50-state registry feeds or automatic export-time refresh. Current bounded imported matching and conservative unverified outcomes are explicit.
- No monetary billing/credits, invoice-cost metrics, calibration/false-positive truth study or measured real-world bounce rate. Query budgets and run counts are real; money/accuracy figures are not invented.
- No automated object-storage provisioning/upload/retention, scheduled coverage expansion, full headless website-function/malware analysis or production load/security audit.
- Run `npm run cleanup` under a controlled scheduler and verify backups/restore and privacy deletion operations before production.

## Human beta plan

Use a small reviewer-approved US and Canadian cohort. Independently check identity, trading activity, exact contact association, site category and source rights before accepting a qualified claim. Review closed/broken/social-only/catch-all/ambiguous examples deliberately. Ask users to flag wrong business, wrong email, bounce, closure and opt-out in the evidence drawer; verify immediate exclusion on re-export. Record reviewer truth and authorized sending feedback separately; report false-positive and bounce rates only after actual observations. Never send test emails to strangers to measure deliverability.
