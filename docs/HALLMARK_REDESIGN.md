# LeadAtlas frontend redesign, 2026-11-04

## Recovered work

Started from clean `main` at `5e22388`, matching `origin/main` after fetch. Read the original specifications, application/routes/components/tests, project documentation, installed Next.js guides and actual Hallmark 2.0.0 skill/reference files. Readable October 30 Codex session endings confirmed the previous revision was completed and deployed. No unfinished local patch existed. See [the recovered handover](HANDOVER_2026_11_04.md).

Branch: `frontend/hallmark-redesign`. No production push or deployment is part of this work.

## Design and scope

Custom brand mode preserves the official PNG wordmark/icon and blue, navy and white identity. [design.md](../design.md) documents the shared system; [tokens.css](../src/app/tokens.css) contains the light/dark palette, type, spacing and interaction roles. Albert Sans is locally hosted with its OFL license. No application dependency was added.

The homepage uses the requested “Find businesses worth contacting.” direction, two distinct website finder paths, an open index of the five established features, evidence criteria, an actual captured interactive tour, audience destinations and the existing substantive FAQ answers. The image is explicitly synthetic. No real leads, metrics, testimonials or provider successes were invented.

The workspace keeps its existing sidebar architecture, destinations, data hooks and components. Search fields come first; qualification guidance and examples remain in a disclosure. Domain ownership attestation, matching strategy, professional context, portfolio upload, incorporation dates and coverage limitations are retained. Results keep semantic tables, filters, pagination, evidence, saving and exports. Phone rows expose all data with labels. Account controls use separate profile/data sections; administrator source descriptions and all operator forms remain.

Authentication now centers the task without a marketing sidebar. Existing password-manager attributes, confirmation, visibility controls, recovery privacy language, resend flow, legal consent and server-driven unavailable states remain. The always-available sample-tour action is retained in the auth footer.

## Preserved boundaries

No changes to `src/lib`, `src/worker`, `src/app/api`, `drizzle`, provider configuration, package manifests/lockfile or security headers. All migrations, API contracts, ownership checks, qualification rules, suppression/source rights and exact CSV behavior remain. The original brand image files are unchanged. No route or component file was removed.

## Audit method

Used Hallmark's installed `redesign.md`, custom direction, app-screen, craft, imagery, brand, state, dark-mode, font, gates and review workflows. Ran the brand scaffold, preflight cache, source gates, browser baseline, first-viewport render/review, rendered preservation comparison and protected-screen review. Codex's skill-specific harness guidance calls for reviews **in-thread**; no independent reviewer is claimed.

The initial homepage/navigation/stylesheet static audit recorded 33 Floor failures, 178 Reflex findings and 8 warnings. Rendering all nine baseline URLs produced 181 Floor failures, 223 Reflex findings and 25 warnings, including app screens temporarily evaluated under marketing rules. Final app checks use `--scope app`; these aggregate numbers are therefore not a like-for-like score comparison. Relevant initial defects included insufficient focus/input contrast, decorated labels, repeated icon grids, literal style values and layout-property transitions.

Hallmark checks eight distinct widths: 320, 375, 414, 768, 1024, 1280, 1440 and 1920px. Its own render tier preserves five screenshots per route and measures the other widths. Additional Playwright screenshots cover all eight widths. Tests also retain the prior 360/390/430px coverage and 200% zoom check.

The protected render audit supplies a **real local authenticated fixture cookie** to Puppeteer through a temporary wrapper. It does not bypass authentication or change production access checks. The fixture database is an isolated PostgreSQL 17 container with the real migrations and two records explicitly flagged as test fixtures. Its credentials are public test-only values, never deployment configuration.

## Findings and fixes

- Replaced repeated icon cards and decorative headings with task-specific rows, clear typography and restrained surfaces.
- Corrected field edges and focus rings. Kept the official blue action fill and derived a darker link/selection token after axe and Hallmark measured 4.39:1 on the pale surface.
- Added an explicit accessible name to the result view selector; its previous wrapping label included every option in the accessible name.
- Moved save/error feedback into the open evidence drawer, preserving the existing API calls.
- Returned keyboard focus to the originating Inspect button after closing evidence; kept the mobile account action readable.
- Separated search-history link text from its location metadata and made history/export data readable on phones.
- Confirmed theme state before labeling screenshots; screenshots taken before hydration are not used as final evidence.
- Replaced an unsuitable concurrent PGlite socket harness with real isolated PostgreSQL. No application database settings were weakened to make the adapter pass.

## Preservation notes and copy changes

Hallmark's source parser originally recorded the expression `{String(href)}` as a link. Three literal audience links retain every actual destination. This expression replacement is recorded in the CSS stamp. Three generated React `useId` values also changed after removing auth marketing markup; the same input names, labels and handlers remain connected. Those generated IDs were not external selectors/test hooks.

Copy changes are deliberate reductions under the user's direction and Hallmark copy gates:

| Before                                                   | After                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Better Leads. Better Opportunities.                      | Find businesses worth contacting.                                              |
| Hero's two-sentence prospecting paragraph                | Research businesses, check contact quality, and build a focused prospect list. |
| A clearer path to your next opportunity.                 | Find your next prospect.                                                       |
| Good research. A simple workflow.                        | See what you’re checking.                                                      |
| Make every contact worth a closer look.                  | A contact needs evidence.                                                      |
| Different goals. The same quality standard.              | Research for the work you do.                                                  |
| Clear answers. Better decisions.                         | Before your first search.                                                      |
| Start with the right business.                           | Overview                                                                       |
| Generic finder introductions and always-visible examples | One factual sentence; examples in the qualification disclosure                 |
| Auth marketing headlines, promise and welcome label      | Task heading and necessary recovery instructions                               |
| All-capitals status display strings                      | Sentence-case presentation; original status values unchanged                   |
| Synthetic sample, all-caps/dot separators                | Synthetic sample, no live leads                                                |

Repeated tagline/eyebrow lines and the redundant closing marketing band were removed. All substantive FAQ answers, legal documents and business qualification caveats remain. The password range is written “12 to 128” with the same policy and constraints. Two existing browser assertions were updated only for the explicitly requested headline and sentence-case synthetic label; no behavioral assertion was removed or loosened.

## Validation and evidence

| Check                                      | Executed result                                                                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Lint / strict TypeScript / diff whitespace | Pass                                                                                                                                      |
| Unit/integration                           | 131 passed across 11 files                                                                                                                |
| Production build                           | Pass, including final skip-link clipping fix                                                                                              |
| Public Playwright                          | 30 passed in the final fresh-server CI-mode run                                                                                           |
| Authenticated production Playwright        | 8 passed against isolated PostgreSQL; four screenshot checks and final two focus/width checks also passed                                 |
| Automated WCAG checks                      | 68 route/theme/device analyses passed; tags WCAG 2 A/AA, 2.1 AA and 2.2 AA                                                                |
| Browser layout                             | All eight Hallmark widths, extra legacy phone widths and 200% zoom; no detected page overflow or production hydration/console errors      |
| Hallmark homepage                          | 0 Floor failures, 0 Reflex findings, 0 warnings; one answered shared-stylesheet Finish item and one nonblocking redesign copy-budget note |
| Hallmark baseline-route preservation       | 0 Floor failures, 0 Reflex findings; one reviewed notice for copy reduction                                                               |
| Hallmark six protected routes              | 0 Floor failures, 0 Reflex findings, 0 warnings                                                                                           |

The screenshot-only public regeneration process terminated after its two desktop checks; its remaining two mobile checks were rerun and passed. A later recheck discovered that the interrupted run had left a stale port-3100 server serving obsolete chunks and an unstyled page. After verifying the asset failure, that server was stopped and all 30 public tests passed with `CI=1` (server reuse disabled). No application styling or test assertion was changed to accommodate the stale server. Screenshots now live outside Playwright’s cleaned output directory, in `.hallmark/validation/`. Initial sandbox socket/subprocess failures were rerun with execution permission. The unsupported PGlite socket attempt and genuine contrast/label issues are recorded above; tests were not weakened to pass.

Open the [standalone comparison](screenshots/hallmark/compare.html), [desktop before](screenshots/hallmark/before-desktop.png), [desktop after](screenshots/hallmark/after-desktop.png), [mobile before](screenshots/hallmark/before-mobile.png) and [mobile after](screenshots/hallmark/after-mobile.png). The comparison includes all 16 public/workspace/auth routes plus the evidence drawer, dark-theme images and eight-width images. Public before images came from the untouched workspace; protected before images were captured from commit 5e22388 in an isolated temporary reference checkout, with the same synthetic local dataset. The original overflowing phone/table layouts are captured as rendered, without correction. Both versions’ results images select All research candidates. Export-history entries are actual test downloads.

Raw final reports: `.hallmark/audit-homepage.txt`, `.hallmark/audit-public.txt`, `.hallmark/audit-protected.txt`; structured results: `.hallmark/validation-results.json`. Hallmark also generated `.hallmark/compare.html` against its original inventory. Historical validation in [QA_CHECKLIST.md](QA_CHECKLIST.md) remains intact.

The in-thread finish review confirmed the research-desk idea across the page and workspace. The old screen made all explanatory examples visible at once; the new screen moves them into the available disclosure/tour to prioritize the task. No blocking visual defect remains known from the captured Chromium views. Real Safari/VoiceOver hardware testing was not performed.

No image slots need replacement. After production integrations are validated, an authorized real-workspace capture would be the most useful additional homepage material.

## Limits

Live Neon, Resend inbox delivery, Inngest/worker dispatch, Hunter/Brave and approved provider calls remain untested without their credentials. The browser suite tests finder request contracts with explicitly intercepted failure responses and tests saved research against real local SQL. It does not establish live lead quality or service availability. Cancel/resume and live evidence-enrichment jobs retain existing backend/integration coverage, rather than a fabricated browser success.

Saved-lead bulk selection, new sorting/filter APIs, global domain matching, broad registry coverage and export-time automatic refresh remain roadmap work. The redesign does not add unsupported actions. The legal pages retain the prior operator-specific contact/retention gaps. Screen-reader testing is automated semantics plus keyboard checks; no human assistive-technology study is claimed.

## Files changed

See the [source/test/documentation manifest](FRONTEND_FILES.md) and [complete path list](../.hallmark/changed-files.json). The local commit is recorded in the final handoff; no branch was pushed.
