# Deployment: Vercel + Neon + Inngest + separate worker

A preview URL has been supplied: `https://lead-atlas-gilt.vercel.app/`. The pre-revision homepage was reached with HTTP 200 and inspected in Chromium. Its public status reported authentication, database, orchestration and verifier configuration as absent. No private environment settings or provider connections were verified. Complete these steps with authorized accounts and staging credentials, then run the live acceptance checks. Do not assume the custom domain is connected.

## 1. Neon PostgreSQL

Create a Neon project with a staging branch. Copy a pooled PostgreSQL connection into `DATABASE_URL` (with TLS) and optionally a direct connection into `DIRECT_URL` for migrations. Both web and worker must access the same database. Never put them in NEXT_PUBLIC variables.

```powershell
npm ci
npm run db:migrate
```

`db:migrate` applies versioned SQL from `drizzle/` and maintains migration history. Do not replace it with a destructive schema reset. The runtime uses Drizzle/postgres.js, three connections per process, no prepared statements, idle timeouts and server-only URLs. Validate connection limits before scaling horizontally. Back up production before later schema migrations.

## 2. Web application on Vercel

Import this GitHub repository into Vercel as Next.js. Use Node 22 and `npm ci`, `npm run build`; the repository `vercel.json` sets a 60-second maximum for the Inngest endpoint. Set:

- DATABASE_URL
- BETTER_AUTH_SECRET (32+ high-entropy characters)
- BETTER_AUTH_URL and APP_BASE_URL to the exact HTTPS web origin
- INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY
- WORKER_URL (HTTPS worker origin), WORKER_SECRET (independent 32+ character secret)
- ADMIN_USER_IDS after creating the founder account
- HUNTER_API_KEY for verified-contact claims; optional BRAVE_SEARCH_API_KEY
- Optional quota variables from `.env.example`; keep `INNGEST_DEV=0`

Provider access-test secrets are optional: GOOGLE_PLACES_API_KEY + GOOGLE_DISPLAY_APPROVED, META_APP_ID/SECRET/TOKEN/GRAPH_VERSION/INSTAGRAM_ACCOUNT_ID after permissions/use review. Restricted provider setup never enables lead exports.

Add `leadatlas.xyz` and, if desired, `www.leadatlas.xyz` in Vercel’s Domains settings. Follow **Vercel’s returned DNS values**, then update auth/base URLs to the canonical origin. Do not assume hard-coded DNS records. Better Auth permits only the configured web origin; do not mix production cookies into preview deployments. Use a separate auth secret and database branch for previews. Verify HTTPS, secure session cookies, CSP, no credential leaks and ownership enforcement.

## 3. Worker on Railway / Render / Fly.io

Build `Dockerfile.worker` from the repository root. Required variables: DATABASE_URL, WORKER_SECRET, PORT, optional BRAVE/HUNTER keys and quota limits. The web’s WORKER_URL must point to this service over HTTPS. Configure persistent service execution, not a serverless timeout. The container runs as the non-root node user and provides `/healthz`.

Example local container commands (inject secrets through a noncommitted environment file):

```powershell
docker build -f Dockerfile.worker -t leadatlas-worker .
docker run --env-file .env -p 4000:4000 leadatlas-worker
```

Only `/healthz` is public without authentication. `/work` checks signed timestamp/body HMAC. Configure ingress restrictions, outbound network policy, log retention, alerts and TLS at the host. Horizontal replicas share PostgreSQL item leases; after a crash Inngest polls and work can be reclaimed. Do not scale beyond Neon’s connection budget. Cross-host saturation, rolling-deploy recovery and load tests still need staging validation.

Raw bulk datasets should be held in operator-managed object storage, with lifecycle/access rules, rather than the Neon database. Run the bounded extractor on an ingestion worker/operator machine. Automatic object-storage provisioning and dataset scheduling are not implemented.

## 4. Inngest Cloud

Create/configure an Inngest app, set event/signing keys on Vercel, and sync `https://lead-atlas-gilt.vercel.app/api/inngest` (or the actual connected custom origin). The registered `qualified-business-search` workflow uses per-owner concurrency, retries, cancellation events and durable sleep/poll steps. It only makes signed worker RPC calls from Vercel. Crawling/enrichment stays on the worker.

In staging: create a real authenticated search, close the browser, confirm persisted progress, restart a worker mid-item, wait for lease expiry, and confirm another replica resumes it without duplicate completed results. Cancel a running search and confirm that no later item commits. Verify dispatch failure appears as `DISPATCH_FAILED` and explicit resume works. No automatic outbox dispatch recovery is claimed.

## 5. Bootstrap and connect permitted sources

Configure transactional email first, create the founder account at `/sign-up`, verify the email, retrieve the user ID from the Neon `users` table, add it to ADMIN_USER_IDS, redeploy, and review per-host/source rights at `/admin/sources`. Run the US/Canadian sample commands in [IMPORTS](IMPORTS.md), preserving release/license/attribution. Confirm actual regional counts. Add Hunter/Brave credentials, then verify a known, authorized business website and public contact using real responses. Meta app approval and Google display-policy review are separate from credentials.

## 6. Retention and operations

Run `npm run cleanup` daily on a controlled worker/CI scheduler. It deletes expired auth records, old rate-limit entries, verification/job event history older than 180 days and failed/cancelled searches older than 90 days. Suppression remains in place while the owner exists. Account deletion cascades owned records. Operator review is required for legal retention, privacy requests, backup retention and deleted-data removal from backups.

Validate transactional verification/password-reset email with a real authorized inbox; add monitoring, error reporting, request limits at the hosting edge, operator-specific terms/privacy/contact details and production secret rotation before a public launch. Never test email deliverability by mailing strangers.

## Validation and rollback

Use `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run test:e2e`. Then execute the missing live-provider/Neon/worker checks in [QA_CHECKLIST](QA_CHECKLIST.md). Preserve migration history and raw extraction manifests. Roll back the Vercel deployment and worker image together only when their schema remains compatible; use Neon branch/backup recovery for data issues rather than deleting tables.

## Customer experience revision: transactional auth and provisioning

1. Use the actual deployment origin for both `BETTER_AUTH_URL` and `APP_BASE_URL`, initially `https://lead-atlas-gilt.vercel.app` with no trailing path. Keep staging and production environments separate. Run the existing versioned migrations against Neon; the auth-only revision required no new migration. Later releases below have additional migrations.
2. In [Resend Domains](https://resend.com/domains), verify a sender domain you control using its supplied DNS records. Create a sending API key; set server-only `RESEND_API_KEY` and `AUTH_EMAIL_FROM` (for example `LeadAtlas <accounts@your-verified-domain>`). Set `AUTH_EMAIL_SENDER_VERIFIED=true` only after verification. Do not use an unverified example sender in production. The implementation uses the [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email) and [Better Auth recovery flow](https://better-auth.com/docs/authentication/email-password).
3. Redeploy. Verify production signup → verification email → sign-in. Retrieve the founder ID from Neon’s `users` table and add it to `ADMIN_USER_IDS`. Administrators can then inspect `/admin/sources` and `/api/admin/status`. Nonadmins cannot access these pages/APIs. Store missing-configuration instructions here, never in customer onboarding.
4. Provision customer coverage through the admin import and website-permission forms using an existing customer email. Permission review remains mandatory. This creates account-owned records/policies; it does not share another customer’s research, lift source restrictions or imply that imported contacts qualify. Regional coverage and worker readiness remain operator responsibilities.
5. Test reset requests for both a known account and an unknown address. The response must remain identical. Confirm a real email is accepted and delivered to an authorized test inbox, then change the password within 15 minutes. Verify the old password and prior sessions fail. Retry the same token and an expired token; both must fail. Request throttles are 3/minute for reset requests and 5/minute for resets, backed by database rate limits. Verification-link requests are also throttled.
6. Monitor redacted server messages for `LeadAtlas password-reset delivery failed` and `LeadAtlas email-verification delivery failed`. A generic recovery response deliberately confirms neither account existence nor email delivery; mail failures do not change it. Missing mail configuration gives a global service-unavailable response. Provider-accepted messages still need actual inbox/bounce testing. No live mail test has been performed here.
7. In GitHub/Vercel confirm the deployment commit equals the pushed main SHA, inspect the build outcome, and run the desktop/mobile smoke checks against the deployed origin. Local production-build tests do not establish Vercel or Neon readiness.

Transactional auth tasks use Better Auth’s background-task hook with Next.js `after`, so Vercel keeps delivery work alive without waiting for provider latency before returning the recovery response. Production inbox delivery still needs live validation.

## Global discovery and frontend corrections release

Deploy the reviewed `feature/global-domain-discovery` branch after validation. This release includes the approved icon-only mark, the four-card homepage section, searchable geography/niches and the separate worldwide domain contract.

1. Back up the target database and apply `npm run db:migrate` with the intended server-only database URL. Additive migration `0003_global_discovery_lease` adds two nullable columns; it does not rewrite existing jobs. Run it before deploying this web or worker version, since both read the updated job schema.
2. Deploy the matching worker image and sync the updated Inngest workflow. Global discovery runs in the background with a renewable lease and durable polling; a Vercel-only deployment does not replace the worker.
3. In Vercel, select this development branch/commit for a preview. Keep preview and production databases, auth origins and secrets separate. The normal build command remains `npm run build`; no new dependency installation procedure is needed.
4. Configure discovery adapters only after reviewing terms and credentials. Flags and variables are documented in `.env.example` and [PRODUCT_CORRECTIONS](PRODUCT_CORRECTIONS.md). Missing credentials/host permissions produce unavailable or unqualified research, never sample prospects. The optional AI adapter remains disabled.
5. Check the preview homepage, four finder routes, sign-in, account/admin boundaries and responsive results before promoting the deployment. Live provider contracts, Neon/worker restart recovery and production mail delivery remain acceptance checks.

The Git push does not merge this branch into `main` or execute a production deployment. Local tests establish build/regression readiness, not verified production data availability.

## Final homepage corrections preview — 2026-11-05

Branch: `frontend/final-homepage-corrections`, based on `ab53d50`. Review the [screenshots and execution record](FINAL_FRONTEND_CORRECTIONS.md) before release. This work has not been deployed or promoted to production.

1. Back up the intended Neon branch and apply **all outstanding versioned migrations**, including `0004_homepage_engagement.sql`, with `npm run db:migrate` before deploying this revision. It adds newsletter consent/events and permissioned testimonials; it does not change prospect schemas or stored jobs. Only isolated local databases have been migrated during development.
2. For updates signup, configure server-only `DATABASE_URL`, `APP_BASE_URL` (the exact HTTPS deployment origin), `RESEND_API_KEY`, `UPDATES_EMAIL_FROM`, `UPDATES_SENDER_VERIFIED=true` and a separate random **32+ character `UPDATES_TOKEN_SECRET`**. Verify the actual sender domain first. Keys alone do not establish sender verification. Auth email uses its existing separate sender configuration. See [.env.example](../.env.example).
3. Keep `UPDATES_TOKEN_SECRET` stable so unsubscribe links in older emails remain valid. Plan key-version support before rotating it; this revision does not retain previous signing keys. The signup form stays unavailable when configuration is missing; database/provider failures return errors, never an active subscription. Database presence booleans are not a health check.
4. Keep `UPDATES_TRUST_PROXY=false` unless the hosting edge strips untrusted client headers and provides a verified client IP. The default still enforces database-backed shared/global and per-address hourly limits. Add the host's edge abuse controls for public traffic; there is no CAPTCHA service dependency.
5. Using an authorized test inbox, submit explicit consent, verify pending persistence, actual Resend acceptance **and inbox receipt**, confirm once, reject token replay/expiry, and exercise both manual and email-client one-click unsubscribe. GET requests do not mutate consent. Confirm/unsubscribe must still work when sending is disabled. No live email was sent during development.
6. No bulk update campaign dispatcher is included. A future campaign must select only `ACTIVE` subscriptions, check suppression immediately before delivery, include each recipient's signed unsubscribe link and meet the mailing provider's current requirements. Never use prospect records as newsletter subscribers. Review retention/deletion requests for the separate consent/event tables; no automatic newsletter retention policy is enabled.
7. Administrators listed in `ADMIN_USER_IDS` can manage `/admin/testimonials`. Use only supplied, approved exact review text; record private publication permission, a publication date and separate photo permission. Optional photos must be approved local assets under `public/testimonials/`; an upload/storage service is not implemented. Draft, revoked, future-dated or unapproved records are hidden. No real reviews are seeded, and ordinary customers cannot read private permission evidence.
8. Verify desktop/mobile preview, transparent header/sidebar mark in both themes, four cards plus separate five-row directory, keyboard navigation, and no empty testimonial section before approval. The [Phase B plan](LEAD_DISCOVERY_NEXT_PHASE.md) is research only; it activates no provider or crawler.
