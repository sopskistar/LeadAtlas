# LeadAtlas

LeadAtlas helps users discover businesses, identify promising leads, and uncover new sales and growth opportunities.

**Find Businesses. Find Opportunities.** A Next.js application for US/Canada business research and worldwide domain-buyer research with four discovery workflows plus lead management and export, persisted evidence and conservative qualification. The original [master specification](LeadAtlas_Codex_Master_Prompt_v2_Quality_First.md) is preserved. The updated source priorities are Facebook Pages, Instagram professional profiles, Google Places (New), Overture Places, then Brave/permitted website research.

This repository contains actual application/backend/worker code. It ships with **no production leads, provider keys, fake results or automatic verified claims**. Nine real, unverified Overture research candidates with source manifests/licences are preserved under `samples/` and are never seeded automatically. Missing configuration is shown in the UI. Google/Meta adapters are restricted; they never feed the export database.

Latest review: [targeted homepage corrections, screenshots and validation](docs/FINAL_FRONTEND_CORRECTIONS.md). Homepage updates signup requires migration **0004**, a verified sender and separate server-only consent secret; testimonials stay hidden until genuine permissioned reviews are approved. The [next lead-discovery architecture](docs/LEAD_DISCOVERY_NEXT_PHASE.md) is researched but not activated.

## Local setup (Node.js 22+, npm)

Windows 11 PowerShell:

```powershell
git clone https://github.com/sopskistar/LeadAtlas.git
cd LeadAtlas
npm ci
Copy-Item .env.example .env.local
# Generate a secret; paste the output into BETTER_AUTH_SECRET.
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
# Generate a separate WORKER_SECRET the same way.
# Set DATABASE_URL to a Neon PostgreSQL pooled connection URL.
npm run db:migrate
npm run dev
```

Linux/macOS: `cp .env.example .env.local`; otherwise the same commands. Next.js reads `.env.local`. CLI scripts load `.env.local` and `.env`. The worker loads `.env`; inject the same runtime values on your worker host or copy the required **server-only** values into its environment. Never commit either file.

Customer pages use the names **Businesses With Websites**, **Businesses Without Websites**, **Domain Buyer Finder**, **New Business Finder** and **Lead Management & Export**. Existing finder URLs and API product IDs are preserved. The `/tour` walkthrough is clearly synthetic, does not create records, and has no export action. Light, Dark and System themes are available throughout the public site and workspace.

For local accounts, open `/sign-up` and use a unique 12–128 character password. Production registration additionally requires transactional email configuration. Retrieve the founder’s user ID from the Neon `users` table, set `ADMIN_USER_IDS`, and restart. Only administrators see `/admin/sources`; direct navigation and its APIs also enforce access. `/settings/sources` redirects to the protected page. Accounts own their records; customers never configure providers or import datasets.

Password recovery uses Better Auth’s 15-minute, single-use reset tokens and revokes existing sessions on success. Resend sends transactional reset and verification links. Configure `RESEND_API_KEY`, `AUTH_EMAIL_FROM` and `AUTH_EMAIL_SENDER_VERIFIED=true` only after verifying your sender domain. Production sign-in requires email verification when this service is configured. Missing mail configuration disables production registration and recovery; provider acceptance is not proof of inbox delivery. Recovery responses do not confirm whether an account exists or mail was delivered. Delivery failures emit a redacted server error for operator monitoring. [Operator setup and staging checks](docs/DEPLOYMENT.md) are required before public launch.

## Run durable jobs

For local development set `INNGEST_DEV=1` on the web process, configure `WORKER_URL=http://localhost:4000`, and set the same random `WORKER_SECRET` on both services. Start these in separate terminals:

```powershell
npm run dev
npm run worker
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

The production setup uses Inngest Cloud event/signing keys and an HTTPS worker URL, never `INNGEST_DEV=1`. See [deployment](docs/DEPLOYMENT.md).

Import a permitted regional dataset through `/admin/sources` or the CLI. Follow [the import contract](docs/IMPORTS.md) for Overture, licensed directories and Canada federal corporation extracts. The worker requires explicit website-host permission and checks robots before researching up to three public pages. **A single open listing, a legal active registration or a live website does not establish current trading activity.** Use the evidence drawer to document independent current activity where automatic corroboration is unavailable.

Set `HUNTER_API_KEY` for real email verification. Without it, syntax/MX checks remain `UNVERIFIED` and cannot qualify. There is no email inference, arbitrary mailbox probing or test-mail sending. Provider-native states, verification dates, source rights and suppression gates are applied before each export. A vendor assessment never guarantees delivery.

## Product routes

| Page                          | Behavior                                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `/business-contacts`          | Country/region/city/niche search for identity-matched functioning websites and qualified contacts                           |
| `/website-opportunities`      | Separate search and licensed contact path; documented absence is an inference, never absolute proof                         |
| `/domain-buyer-finder`        | Strict existing-domain stem/prefix/suffix/confirmed typo matching; portfolio upload; personal-name ambiguity retained       |
| `/new-businesses`             | Incorporation-date queries against imported Canada federal or approved state filings; all US feeds explicitly not connected |
| `/searches/[id]`              | Persisted progress, research/qualified filters, evidence drawer, cancel/resume, export                                      |
| `/leads`, `/jobs`, `/exports` | Saved research, user tags/notes, search and export history                                                                  |
| `/admin/sources` (admin only) | Real configuration states, limitations, rights controls and bounded import                                                  |
| `/settings/account`           | Account/session state, admin ID, privacy/deletion controls                                                                  |

All 50 US states + DC and 13 Canadian provinces/territories are selectable. Any city/niche can be entered. City suggestions use a bundled, attributed GeoNames reference with indexed server-side pagination. Searchable niches use the full 2022 six-digit NAICS taxonomy plus narrow business-name synonyms; custom cities and niches remain valid. No business coverage is implied by these references.

Administrators can specify an existing **Customer workspace email** on import and host-permission forms to provision that account. Omit it to target your own workspace. This preserves per-account rights and isolation; there is no shared global prospect pool. A customer with no provisioned coverage will get no real results. The public status endpoint exposes only customer service availability; detailed configuration is under authenticated `/api/admin/status`.

## Validation

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Tests use fixtures and an isolated PGlite PostgreSQL engine with real migrations, Drizzle queries and Better Auth. They do **not** substitute for a Neon staging test or provider contract tests with real credentials. Browser smoke tests target the production build with no secrets. See [actual QA results and remaining acceptance work](docs/QA_CHECKLIST.md).

## Documentation

- [Architecture, APIs, security and limitations](docs/ARCHITECTURE.md)
- [Source matrix and licensing boundaries](docs/SOURCE_MATRIX.md)
- [Imports and regional sample commands](docs/IMPORTS.md)
- [Vercel / Neon / Inngest / worker deployment](docs/DEPLOYMENT.md)
- [QA checklist and untested integrations](docs/QA_CHECKLIST.md)
- [Future modules and remaining work](docs/ROADMAP.md)

The approved `leadatlas-icon-v2.png` is the only navigation mark. Optimized copies and derived favicon/app sizes are in `public/brand/`; original uploads are preserved. No wordmark is rendered in navigation.

## Frontend redesign review

The Hallmark custom-brand frontend redesign continues the existing application. See the [recovered handover](docs/HANDOVER_2026_11_04.md), [shared design system](design.md), [redesign and validation report](docs/HALLMARK_REDESIGN.md), [before/after comparison](docs/screenshots/hallmark/compare.html), and [isolated authenticated browser-review setup](tests/visual/README.md). Backend integration and production configuration remain a separate phase.

## Global domain research corrections

Domain Buyer Finder now uses a separate worldwide contract, authorized modular discovery adapters, strict evidence-based domain relationships and the existing verification/suppression/export gates. Keys and explicit use approval are required; no live provider is claimed as validated. See [implementation, limits and release checks](docs/PRODUCT_CORRECTIONS.md), [reference-data provenance](src/lib/reference/SOURCES.md) and the [visual comparison](docs/screenshots/corrections/compare.html). Apply migration `0003_global_discovery_lease` before deploying the paired web/worker changes.

## Frontend storytelling refinement

The eight-item lead-source catalog remains visible when sources are disabled. Availability reflects authorized data in each workspace, and clear selections persist. The homepage retains its four discovery blocks and separate five-row directory, replaces the large tour screenshot with a fictional product-workflow preview, and uses an animated use-case strip until approved reviews exist. See [the refinement report and screenshots](docs/FRONTEND_STORYTELLING_REFINEMENT.md).
