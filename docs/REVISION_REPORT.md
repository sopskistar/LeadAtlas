# Customer experience revision — 2026-10-30

## Inherited state

The existing workspace was clean on `main` at `d502635`; no uncommitted work needed recovery. GitHub was one commit ahead (`5c5ae85`), containing only the requested UI/UX revision specification. That commit was inspected and fast-forwarded into this checkout. No second clone, reset, force push or migration replacement was used.

The inherited application already implemented four discovery workflows, conservative qualification, source rights, email-verification adapters, owner-scoped research, saved leads, suppression, qualified CSV export, Better Auth, Drizzle/Neon, Inngest and a separate worker. Live connections were explicitly incomplete. These boundaries and all three migrations remain intact.

## Delivered changes

- Clear **Businesses With Websites** and **Businesses Without Websites** names throughout the site and workspace. All five features include an explanation and example; existing finder routes and API product IDs remain unchanged.
- A redesigned quality-first homepage with labeled illustrative preview, workflow, use cases, FAQ and calls to action. Supplied wordmark/icon assets are preserved. No customer testimonials, outcome statistics or real verification results were invented.
- Persisted Light/Dark/System themes, accessible theme selection, mobile navigation drawers, readable search forms, responsive cards and keyboard-scrollable result tables.
- New `/sign-up`, `/forgot-password`, `/reset-password` and `/tour` routes. Registration has password confirmation, eye controls, passphrase guidance and password-manager support. The tour is synthetic, creates no records and cannot export.
- Better Auth recovery uses 15-minute single-use tokens, atomic consumption and session revocation. Resend integration supports reset and verification emails; production registration requires mail configuration. Recovery responses do not disclose accounts or delivery outcomes. Missing services remain unavailable.
- `/admin/sources` and `/api/admin/status` enforce administrator access; the old settings URL redirects into the protected route. Source reads and mutations are also protected. Administrators can provision licensed records and host permissions for an existing customer account without sharing other accounts’ data.
- The reported development issue was reproduced: production CSP blocked React development debugging. The documented development-only allowance removes the warning/indicator; production continues to exclude `unsafe-eval`.

## Validation

See the current results in [QA_CHECKLIST.md](QA_CHECKLIST.md). They distinguish executed local production-build tests, actual SQL/auth integration tests, synthetic browser fixtures and live-service checks. Before/after screenshots are linked there and stored in `docs/screenshots/revision/`; search, dashboard and authentication screenshots are generated under ignored `test-results/`.

No live provider search, Neon staging flow, transactional inbox delivery, worker deployment or custom-domain connection is claimed. A real Chromium visit and HTTP request reached the pre-revision Vercel preview; its public status reported authentication, database, orchestration and Hunter verifier configuration as absent.

## Operator actions still required

1. Configure Neon and run the preserved migrations; set the auth secret and exact deployment origin.
2. Verify a Resend sender domain; configure `RESEND_API_KEY`, `AUTH_EMAIL_FROM` and `AUTH_EMAIL_SENDER_VERIFIED`. Validate signup verification and password recovery using an authorized inbox.
3. Deploy the HTTPS worker and connect Inngest; configure Hunter and any approved optional providers. Run the live acceptance checks in the QA checklist.
4. Bootstrap `ADMIN_USER_IDS` from Neon’s users table. Provision licensed regional records and reviewed website permissions through the administrator page. Customers require no technical setup.
5. Publish the operator’s legal identity, privacy contact and retention policy; configure monitoring and backups. Confirm Vercel deploys the pushed `main` commit before opening public registration.

Exact environment and staging instructions are in [DEPLOYMENT.md](DEPLOYMENT.md). Existing product-depth limitations, including bounded domain matching and limited registry coverage, remain documented in [ROADMAP.md](ROADMAP.md).

Transactional auth tasks use Better Auth’s background-task hook with Next.js `after`, so Vercel keeps delivery work alive without waiting for provider latency before returning the recovery response. Production inbox delivery still needs live validation.
