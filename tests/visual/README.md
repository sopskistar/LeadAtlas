# Authenticated frontend review

This optional suite uses a disposable **local PostgreSQL container**, actual migrations, Better Auth and owner-scoped APIs. It never connects to Neon, contacts providers or sends mail. Records are marked `fixture: true` and exports must contain zero sample contacts. The seed script hardcodes the localhost review database to prevent use against a deployed database.

```sh
docker run --rm --name leadatlas-visual-review --detach \
  --publish 127.0.0.1:5439:5432 --env POSTGRES_PASSWORD=visual-local-only \
  --env POSTGRES_DB=leadatlas_visual --tmpfs /var/lib/postgresql/data postgres:17-alpine
npx tsx tests/visual/fixture-server.mts
npx tsx tests/visual/seed-domains.mts
npm run build
```

Start the built application in a separate terminal:

```sh
DATABASE_URL=postgres://postgres:visual-local-only@127.0.0.1:5439/leadatlas_visual \
BETTER_AUTH_SECRET=visual-only-local-secret-12345678901234567890 \
BETTER_AUTH_URL=http://127.0.0.1:3101 APP_BASE_URL=http://127.0.0.1:3101 \
ADMIN_USER_IDS=visual-review-admin npm run start -- --hostname 127.0.0.1 --port 3101
```

```sh
npx playwright test --config tests/visual/playwright.config.ts
docker stop leadatlas-visual-review
```

The credentials are public **test-only** values: `review@example.com`, `Visual-Only-Passphrase-2026`. Never use them in deployment. Data lives in tmpfs and the container is removed when stopped. Tests cover real sign-in, all protected screens, two-theme axe checks, saved research filtering/notes/evidence, fixture export exclusion and eight responsive widths. Finder dispatch is explicitly intercepted to test request fields and visible failure without initiating a worker job. This does not establish live Neon/provider readiness or production load capability.

Screenshots are written to ignored `.hallmark/validation/`, outside Playwright’s cleaned output directory. Traces are written to ignored `test-results/`. The main `npm run test:e2e` suite runs without credentials and checks unavailable states and protected boundaries.

The initial PGlite socket attempt was retired after PostgreSQL protocol state failed under the existing connection pool. No production pool settings or authentication rules were changed to accommodate the test adapter. The existing 131 unit/integration tests still use their original supported direct PGlite adapter.

For an authoritative public production run after rebuilding, use `CI=1 npm run test:e2e` with port 3100 free. This disables Playwright's normal local-server reuse. An interrupted capture once left an older server on that port; it returned obsolete chunk references after a rebuild. The stale server was identified and stopped, and the assertions were rerun against a fresh process. Do not interpret an unstyled stale-server page as the current application.

The domain fixture adds one fictional global result. The suite reuses a real authenticated session within each worker so repeated test runs do not weaken or bypass sign-in rate limits. Global result tests check the table at eight widths, horizontal keyboard scrolling, pointer access, evidence focus return and both themes. CSS containment keeps wide tables inside their scroll region and prevents mobile layout-viewport expansion.
