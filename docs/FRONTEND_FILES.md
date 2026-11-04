# Frontend file manifest

The complete path list is in [changed-files.json](../.hallmark/changed-files.json). No backend/API/worker/migration/provider or package-manifest file changed.

## Application source

- [src/app/base.css](../src/app/base.css)
- [src/app/globals.css](../src/app/globals.css)
- [src/app/layout.tsx](../src/app/layout.tsx)
- [src/app/not-found.tsx](../src/app/not-found.tsx)
- [src/app/page.tsx](../src/app/page.tsx)
- [src/app/tokens.css](../src/app/tokens.css)
- [src/components/account.tsx](../src/components/account.tsx)
- [src/components/auth-form.tsx](../src/components/auth-form.tsx)
- [src/components/catalog.tsx](../src/components/catalog.tsx)
- [src/components/leads-table.tsx](../src/components/leads-table.tsx)
- [src/components/navigation.tsx](../src/components/navigation.tsx)
- [src/components/password-field.tsx](../src/components/password-field.tsx)
- [src/components/search-form.tsx](../src/components/search-form.tsx)
- [src/components/shell.tsx](../src/components/shell.tsx)
- [src/components/sources.tsx](../src/components/sources.tsx)
- [src/components/tour.tsx](../src/components/tour.tsx)
- [src/components/ui.tsx](../src/components/ui.tsx)
- [src/components/workspace.tsx](../src/components/workspace.tsx)

## Browser checks and fixture setup

- [tests/e2e/hallmark.spec.ts](../tests/e2e/hallmark.spec.ts)
- [tests/e2e/smoke.spec.ts](../tests/e2e/smoke.spec.ts)
- [tests/visual/README.md](../tests/visual/README.md)
- [tests/visual/fixture-server.mts](../tests/visual/fixture-server.mts)
- [tests/visual/playwright.config.ts](../tests/visual/playwright.config.ts)
- [tests/visual/workspace.spec.ts](../tests/visual/workspace.spec.ts)

## Documentation

- [.hallmark/brand-spec.md](../.hallmark/brand-spec.md)
- [README.md](../README.md)
- [design.md](../design.md)
- [docs/FRONTEND_FILES.md](../docs/FRONTEND_FILES.md)
- [docs/HALLMARK_REDESIGN.md](../docs/HALLMARK_REDESIGN.md)
- [docs/HANDOVER_2026_11_04.md](../docs/HANDOVER_2026_11_04.md)
- [docs/QA_CHECKLIST.md](../docs/QA_CHECKLIST.md)

## Assets and audit records

The official existing logos are unchanged. Added Albert Sans and its OFL license under `public/fonts/`, one actual synthetic-tour capture under `public/images/`, and desktop/mobile comparison PNGs plus `compare.html` under `docs/screenshots/hallmark/`. Audit/preflight/log/result records live in `.hallmark/`; temporary screenshot output and fixture session cookies are excluded from Git.
