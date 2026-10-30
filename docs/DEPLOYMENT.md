# Deployment: Vercel + Neon + Inngest + separate worker

No infrastructure or production environment has been created/deployed by this implementation. Complete these steps with authorized accounts and staging credentials, then run the live acceptance checks.

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

Create/configure an Inngest app, set event/signing keys on Vercel, and sync `https://leadatlas.xyz/api/inngest`. The registered `qualified-business-search` workflow uses per-owner concurrency, retries, cancellation events and durable sleep/poll steps. It only makes signed worker RPC calls from Vercel. Crawling/enrichment stays on the worker.

In staging: create a real authenticated search, close the browser, confirm persisted progress, restart a worker mid-item, wait for lease expiry, and confirm another replica resumes it without duplicate completed results. Cancel a running search and confirm that no later item commits. Verify dispatch failure appears as `DISPATCH_FAILED` and explicit resume works. No automatic outbox dispatch recovery is claimed.

## 5. Bootstrap and connect permitted sources

Create the founder account at `/sign-in`, copy the account ID from account settings, add it to ADMIN_USER_IDS, redeploy, and review per-host/source rights. Run the US/Canadian sample commands in [IMPORTS](IMPORTS.md), preserving release/license/attribution. Confirm actual regional counts. Add Hunter/Brave credentials, then verify a known, authorized business website and public contact using real responses. Meta app approval and Google display-policy review are separate from credentials.

## 6. Retention and operations

Run `npm run cleanup` daily on a controlled worker/CI scheduler. It deletes expired auth records, old rate-limit entries, verification/job event history older than 180 days and failed/cancelled searches older than 90 days. Suppression remains in place while the owner exists. Account deletion cascades owned records. Operator review is required for legal retention, privacy requests, backup retention and deleted-data removal from backups.

Add transactional verification/password-reset email, monitoring, error reporting, request limits at the hosting edge, operator-specific terms/privacy/contact details and production secret rotation before a public launch. Never test email deliverability by mailing strangers.

## Validation and rollback

Use `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run test:e2e`. Then execute the missing live-provider/Neon/worker checks in [QA_CHECKLIST](QA_CHECKLIST.md). Preserve migration history and raw extraction manifests. Roll back the Vercel deployment and worker image together only when their schema remains compatible; use Neon branch/backup recovery for data issues rather than deleting tables.
