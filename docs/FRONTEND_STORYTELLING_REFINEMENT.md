# Frontend storytelling refinement — 2026-11-06

Targeted work on `feature/source-controlled-discovery`. The approved logo, four homepage discovery blocks, separate five-row feature directory, existing finder routes, admin testimonial workflow, and lead-discovery contracts remain in place.

## Lead sources

Both business finders render the same eight-source catalog even while availability is loading or unavailable: Google Maps, Bing Search, Facebook Pages, Instagram Business, Google Search, Brave Search, Overture Places, and Authorized Business Directories. Disabled sources remain visible with concise status labels. The customer UI does not expose provider configuration or crawler details.

Only authorized imported sources with records in the signed-in customer's workspace can be selected. Overture and directory/import availability is now account-data-backed; unsupported external providers remain disabled. The number of selected sources is visible. “Select all available” checks every supported option, while “Clear selection” saves an empty preference. Preferences remain separate per finder. A search cannot be submitted without at least one selected source.

## Homepage product story

The four discovery blocks and five-row “Find your next prospect.” directory are unchanged. The old large tour screenshot was replaced by `ProductWorkflowPreview`, a responsive workflow showing Discover, Research, Verify, and Organize alongside a compact search/source/result preview. Its business and contact use reserved `.example` data and are explicitly marked fictional; the preview does not claim to have run a search or verified a contact. The interactive `/tour` remains linked from the new section and the evidence section.

The approved public icon, current page flow, quality section, audience section, FAQ, subscription, and footer remain in place. The narrative now moves from the four finder routes to the evidence standard, the workflow, intended audiences, and the existing answers and signup.

## Moving use cases and testimonials

The existing `/api/testimonials` and private `/admin/testimonials` workflow remains the only testimonial source. Up to five approved, permission-granted reviews use the animated card strip. Its second visual sequence is inert and hidden from assistive technology. Desktop movement pauses on hover, keyboard focus, or the pause control. Reduced-motion users receive a static strip; mobile uses a native horizontally scrollable, snap-aligned strip for swipe navigation.

When there are no approved reviews, the same presentation shows five concise role-based use cases for website developers, marketing agencies, sales professionals, domain investors, and business researchers. They are labelled “Use cases, not customer reviews,” contain no invented people or outcomes, and do not seed the testimonial database.

## Validation and screenshots

Baseline images are the committed `d299a31` homepage capture. After images are captured from the revised local build. In each theme pair, compare desktop and phone at full page. Finder screenshots show source controls on both business finder routes.

| View                                                                     | Before                                                                 | After                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop, light                                                           | [PNG](screenshots/frontend-storytelling/before/home-desktop-light.png) | [PNG](screenshots/frontend-storytelling/after/home-desktop-light.png)                                                                                                                                                                                                                                                                                                                                                                 |
| Desktop, dark                                                            | [PNG](screenshots/frontend-storytelling/before/home-desktop-dark.png)  | [PNG](screenshots/frontend-storytelling/after/home-desktop-dark.png)                                                                                                                                                                                                                                                                                                                                                                  |
| Mobile, light                                                            | [PNG](screenshots/frontend-storytelling/before/home-mobile-light.png)  | [PNG](screenshots/frontend-storytelling/after/home-mobile-light.png)                                                                                                                                                                                                                                                                                                                                                                  |
| Mobile, dark                                                             | [PNG](screenshots/frontend-storytelling/before/home-mobile-dark.png)   | [PNG](screenshots/frontend-storytelling/after/home-mobile-dark.png)                                                                                                                                                                                                                                                                                                                                                                   |
| Businesses With Websites source controls, desktop fixture, light/dark    | —                                                                      | [Light](screenshots/frontend-storytelling/after/sources-desktop-contacts-fixture-light.png) · [Dark](screenshots/frontend-storytelling/after/sources-desktop-contacts-fixture-dark.png)                                                                                                                                                                                                                                               |
| Businesses Without Websites source controls, desktop fixture, light/dark | —                                                                      | [Light](screenshots/frontend-storytelling/after/sources-desktop-opportunities-fixture-light.png) · [Dark](screenshots/frontend-storytelling/after/sources-desktop-opportunities-fixture-dark.png)                                                                                                                                                                                                                                     |
| Source controls, mobile fixture, light/dark                              | —                                                                      | [Contacts light](screenshots/frontend-storytelling/after/sources-mobile-contacts-fixture-light.png) · [Contacts dark](screenshots/frontend-storytelling/after/sources-mobile-contacts-fixture-dark.png) · [Opportunities light](screenshots/frontend-storytelling/after/sources-mobile-opportunities-fixture-light.png) · [Opportunities dark](screenshots/frontend-storytelling/after/sources-mobile-opportunities-fixture-dark.png) |
| All sources unavailable, light/dark                                      | —                                                                      | [Light](screenshots/frontend-storytelling/after/sources-unavailable-light.png) · [Dark](screenshots/frontend-storytelling/after/sources-unavailable-dark.png)                                                                                                                                                                                                                                                                         |

Screenshots of source controls are deterministic Playwright fixtures. They demonstrate visible catalog entries, selectable/disabled states and responsive presentation; they do not establish that any external provider is operational. The no-data screenshots show the truthful empty state.

## Validation results

- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm test` — passed, 178 tests across 15 files.
- `npm run build` — passed with Next.js 16.4.3.
- `npm run test:e2e` — 56 desktop/mobile cases exercised, including eight-width homepage checks, source selection/persistence and unavailable-source states, both themes, motion preferences, mobile swipe layout and existing navigation/accessibility checks. Full runs were intermittently affected by local browser/server instability: one run passed 55/56 and the remaining test failed with `ERR_NETWORK_CHANGED`; a parallel run had two mobile timing/layout failures. The affected menu, keyboard-navigation, niche-suggestion, and responsive-layout cases passed when rerun individually (keyboard navigation passed three repeats). The focused workflow/motion test passed on desktop and mobile after the final interaction fix.
- Hallmark `sloplint` static app audit — clean, 0 FAIL, 0 REFLEX, 0 WARN across the five touched interface files.
- Hallmark browser-render tier could not run: `puppeteer-core` is not installed and a temporary install stalled in this environment. Hallmark static app scan is clean. The pages were rendered and inspected through Playwright; the screenshot artifacts above are from that browser run.
- Visual inspection covered homepage desktop/mobile in light and dark, finder source lists in both products, and the zero-available state. No clipping or contrast issue was found in the reviewed screens.

External source credentials, account-specific permitted imports, and real approved reviews remain runtime inputs. No Google, Bing, Meta, or search provider is claimed as live by this refinement. The testimonial strip uses five clearly marked role-based use cases until genuine approved reviews exist.

## Files changed

- `src/components/search-form.tsx` and `src/lib/server/api.ts`: visible source catalog, availability states, record-backed selectable sources, and persistent clear behavior.
- `src/components/product-workflow-preview.tsx`, `src/app/page.tsx`, and `src/app/globals.css`: responsive product story, motion, and finder control styling.
- `src/components/homepage-engagement.tsx`: approved-review strip with use-case fallback.
- Integration and browser tests; this report, architecture note, QA note, and README link.
