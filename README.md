# LeadAtlas

LeadAtlas helps users discover businesses, identify promising leads, and uncover new sales and growth opportunities.

**Find Businesses. Find Opportunities.** A Next.js application for US/Canada business research with four separate tools, persisted evidence and conservative qualification. The original [master specification](LeadAtlas_Codex_Master_Prompt_v2_Quality_First.md) is preserved. The updated source priorities are Facebook Pages, Instagram professional profiles, Google Places (New), Overture Places, then Brave/permitted website research.

This repository contains actual application/backend/worker code. It ships with **no production leads, provider keys, fake results or automatic verified claims**. Nine real, unverified Overture research candidates with source manifests/licences are preserved under `samples/` and are never seeded automatically. Missing configuration is shown in the UI. Google/Meta adapters are restricted; they never feed the export database.

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

Open `/sign-in`, select **Create account**, and use a password with at least 12 characters. Account ID appears under `/settings/account`. Set `ADMIN_USER_IDS` to that ID and restart the web app. Only designated administrators can ingest data or approve source/host permissions. Accounts own their records; provider keys are operator-managed. Email/password authentication works; email verification and password-reset delivery are **not configured**, and production launch requires a transactional email implementation.

## Run durable jobs

For local development set `INNGEST_DEV=1` on the web process, configure `WORKER_URL=http://localhost:4000`, and set the same random `WORKER_SECRET` on both services. Start these in separate terminals:

```powershell
npm run dev
npm run worker
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

The production setup uses Inngest Cloud event/signing keys and an HTTPS worker URL, never `INNGEST_DEV=1`. See [deployment](docs/DEPLOYMENT.md).

Import a permitted regional dataset through `/settings/sources` or the CLI. Follow [the import contract](docs/IMPORTS.md) for Overture, licensed directories and Canada federal corporation extracts. The worker requires explicit website-host permission and checks robots before researching up to three public pages. **A single open listing, a legal active registration or a live website does not establish current trading activity.** Use the evidence drawer to document independent current activity where automatic corroboration is unavailable.

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
| `/settings/sources`           | Real configuration states, limitations, rights controls and bounded import                                                  |
| `/settings/account`           | Account/session state, admin ID, privacy/deletion controls                                                                  |

All 50 US states + DC and 13 Canadian provinces/territories are selectable. Any city/niche can be entered. City suggestions require GeoNames import; no preseeded global business coverage is claimed.

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

The supplied v2 wordmark/icon are copied unchanged to `public/brand/`, while the original root assets remain preserved.
