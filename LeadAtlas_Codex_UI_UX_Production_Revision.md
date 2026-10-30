# LeadAtlas — Customer Experience, Mobile, Authentication & Production-Readiness Revision

Repo: https://github.com/sopskistar/LeadAtlas
Current preview: https://lead-atlas-gilt.vercel.app/
Existing implementation: Next.js/TypeScript, five-dimensional evidence pipeline, four discovery workflows plus saved leads/exports, Better Auth, Neon/Drizzle, Inngest, separate worker. Current documented blockers include live Neon and worker connections, API credentials, transactional auth email, and provider permissions.

## Mission
Continue from the existing implemented code. **Do not rebuild the app, replace tested functionality with mock data, or weaken qualification, suppression, source rights, security or export rules.** This is a focused UX/visual/auth/production-readiness iteration. Preserve existing behavior and tests. Treat this document as the immediate task; the existing v2 quality-first master specification remains authoritative for backend behavior.

Read README.md, docs/ARCHITECTURE.md, docs/DEPLOYMENT.md, docs/QA_CHECKLIST.md, src/app/page.tsx, src/components/catalog.tsx, src/components/shell.tsx, src/app/sign-in/page.tsx and relevant workspace components. Audit the current Vercel build and screenshots if available. Work in small, testable changes.

## 1. Stronger public-facing messaging

LeadAtlas sells **quality over quantity**, not vague business searching. Make the value clear in under five seconds.

Preferred hero:
- Eyebrow: `QUALIFIED BUSINESS INTELLIGENCE`
- H1: `Better Leads. Better Opportunities.`
- Supporting copy: `Discover relevant businesses, find verified contact information, and spend less time chasing outdated prospects. Built for smarter outreach, not bigger spreadsheets.`
- Primary CTA: `Explore LeadAtlas` or `Find qualified leads`
- Secondary CTA: `See how it works`

Avoid promising zero bounces, guaranteed active businesses, guaranteed buyers or fully verified emails before source/verifier checks succeed.

Remove the customer-facing `Uncertain stays uncertain` callout from the marketing hero. Keep nuanced qualification caveats in appropriate product help, evidence drawers, Terms and FAQs. Replace the large internal compliance checklist with a beautiful *truthful* product-preview UI (representative clearly marked preview, not fake lead results) explaining activity, website and email checks. Provide a distinctive but restrained blue/white hero; do not add fake testimonials, fake metrics, fake reviews, stock photos or invented trust badges.

Public homepage structure:
1. Header: brand, Features, How it works, Who it's for, Pricing only if implemented, Sign in, Get started, theme control.
2. Hero with targeted value proposition, CTA and high-quality product preview.
3. **Five main features**, near the top and one click away:
   - Business Contact Finder: businesses with functioning websites and sourced public business emails.
   - Website Opportunity Finder: businesses with no identifiable independent website and a suitable public contact.
   - Domain Buyer Finder: closely matched brandable, personal-name and exact-match existing-domain prospects, not wide industry blasts.
   - New Business Finder: newly registered businesses plus independent qualification.
   - Lead Management & Export: saved leads, suppression, review and qualified-only exports.
4. How it works: Search → Check evidence → Review results → Save/export.
5. Use cases for website agencies, domain investors and sales/marketing teams.
6. Benefits: fewer stale contacts, transparent contact quality, more relevant prospects. Do not fabricate outcome rates.
7. Concise FAQ about coverage, verification, email uncertainty and data use.
8. Final CTA and polished footer (Terms, Privacy, Contact where genuinely implemented).

Rename `Four focused tools` to `Five main features`. Keep the four distinct research workflows; Lead Management & Export is the fifth feature, not a fifth search engine.

## 2. Branding and logo system

Use the already installed assets in `public/brand/`:
- `leadatlas-wordmark.png` for normal desktop header/sidebar and marketing placements.
- `leadatlas-icon.png` for favicon, collapsed/mobile sidebar and app icon.

Avoid duplicated `LeadAtlas` text beside a wordmark that already contains the name. Do not squeeze the logo, long tagline and navigation into a single horizontal line. In the large hero/footer, place a short tagline **beneath** a logo/brand lockup or in a separate text area. In a compact desktop navigation use the wordmark alone, and on narrow mobile show the icon plus an accessible brand label (or compact wordmark if it fits). Preserve aspect ratio and breathing room.

Suggested brand tagline: `Quality leads. Clearer opportunities.`
Use a modern white/blue/navy visual language, crisp typography, authentic product mockup previews, balanced whitespace and restrained motion. Preserve accessibility, good contrast and reduced-motion handling. Distinctive and professional—not a generic AI-generated SaaS template.

## 3. Theme switching

Implement functioning **Light / Dark / System** theme selection in public pages, account pages and authenticated workspace, ideally via a stable existing library such as next-themes if appropriate.
- Persist preference safely, avoid hydration mismatch/flash, support system color scheme changes and high contrast.
- Style form controls, cards, tabs, sidebar, menus, badges, tables, toasts, dialogs and error states in both modes.
- Include an accessible toggle/menu on desktop and mobile; test keyboard operation.
- Default to polished light mode; dark mode must use the LeadAtlas blue brand, not pure black with low-contrast blue text.

## 4. Real customer onboarding vs. operator setup

**Ordinary LeadAtlas customers must NOT set up Neon, Inngest, database migrations, API provider keys, worker deployment, source permissions or license imports. These are operator tasks.**

Remove customer-facing messages such as `Configure Neon and Better Auth`, `Set up sources`, `import a permitted regional dataset`, `review website-host permissions`, `Hunter key missing`, and `Inngest and worker required` from public pages and non-admin workspace routes. Do not merely disguise broken functionality: wire the backend correctly and fail gracefully.

The standard customer journey must be:
Home → Sign up / Sign in → brief welcome/tutorial → choose a finder → enter country/region/city/niche or domain → run search (if backend ready) → results/quality indicators → save/export qualified leads.

Move source keys, detailed provider status, import screens, host approvals, admin IDs and deployment readiness to **an administrator-only route**, visible only for authenticated IDs in `ADMIN_USER_IDS`. Enforce authorization on the server as well as hiding menu links; prevent direct navigation/access by ordinary users. Rename the admin page e.g. `Admin → Data sources & operations`.

Do not present all backend provider names and source contracts in public navigation/hero. However, preserve any legally required dataset attribution, compliant sourcing disclosures and source evidence/links when needed to validate contact origin, permissions or provide user recourse. Customers may see plain-language `Coverage and freshness` help, not an admin provider catalogue.

For new customers, offer a zero-setup sample tour using **clearly labeled synthetic UI fixtures only**, with no fabricated real leads. Keep live search disabled until operator connections are genuinely working, and provide polite customer-facing `Search temporarily unavailable` wording and a functioning return path.

Provide a friendly empty state when user has no saved leads or searches. Users should not have to upload their own lead lists to use the product (portfolio uploads for domain matching remain optional). Only administrators ingest licensed source datasets.

## 5. Fix sign-up, login and reset-password UX

Inspect Better Auth integration, status response, Vercel environment setup and migrations. Authentication currently disables customer signup if Neon/Better Auth are not configured. Document the exact operator configuration steps; do not pretend account creation works without valid database settings.

Implement:
- Signup with name, email, password, confirmation password and clear errors.
- Login with email and password.
- Accessible show/hide password eye controls on password/confirmation fields, with stable focus and correct input types.
- Minimum 12-character password policy, reasonable maximum, secure hashed storage, password strength guidance and support for paste/password managers/passphrases. Do not require the customer's personal name in the password; consider optional non-intrusive character-class strength hints rather than brittle mandatory complexity.
- `Forgot password?` and `/forgot-password` / `/reset-password` flow with short-lived, single-use server-validated reset tokens, request throttling, privacy-preserving success response that does not reveal registered email accounts, secure reset-link origin and session invalidation where supported.
- Real transactional email integration (e.g. Resend or Postmark, whichever fits docs and verified sender domain) with secret in server environment. If credentials/sender verification are absent, show operator-only setup status; never claim a reset email was sent when delivery was not actually attempted/accepted.
- Appropriate verification, resend, session expiry and sign-out UX.
- Consistent light/dark responsive design for all auth screens.

Do not ship public registration as 'live' until Neon, migrations, auth secret, trusted origin, and transactional email/reset setup have been verified in staging.

## 6. Mobile-first layout overhaul

Redesign at 320, 360, 375, 390, 430, 768, 1024 and 1440+ px; test in Chromium and real-browser emulation.
- Public navbar: no cramped text, overflow or broken links; menu drawer with proper focus/close/escape behavior; prominent CTA.
- Workspace: mobile drawer, accessible menu toggle, readable breadcrumbs, clear active selection; never show the entire desktop sidebar squished onto a phone.
- Landing hero: correct headline wrapping, readable line height, well-sized actions, no oversized empty space or horizontal clipping.
- Feature cards: clear stacking on phones, two columns where appropriate, well-sized touch targets.
- Search forms: single-column mobile, consistent paddings, labels and error states, sticky action only if safe.
- Results: compact lead cards or deliberate horizontally scrollable tables with fixed context; no off-screen export buttons.
- Provider settings: admin-only and usable on mobile.
- Both themes, auth pages, modals, toasts, error/loading/empty states must be responsive.
- Respect WCAG 2.2 AA focus/contrast and touch target guidance, keyboard navigation, zoom to 200%, and reduced motion.

Inspect and fix the red `1 Issue` development overlay from screenshots by resolving the actual Next.js error/warning; do not silence errors. Do not confuse a production deployment with tests that ran only on localhost.

## 7. Shipping and acceptance

Confirm Vercel is deploying from the expected GitHub `main` commit and that live environment variables correspond to its deployment. Work with the deployed preview `https://lead-atlas-gilt.vercel.app/` until a custom domain is actually connected. Do not assume `leadatlas.xyz` DNS is already configured.

Run formatting, lint, strict typecheck, unit/integration tests, build, e2e tests and accessibility checks. Extend Playwright coverage to signup eye toggle, password validation, reset request states, theme changes and persistence, mobile navigation, unauthenticated redirects, blocked access to admin pages, responsive cards/forms and absence of public developer warnings.

Test production routing and ensure search and account actions correctly report real backend configuration. Verify no 404/500 errors, no hydration warnings, no horizontal overflow and no unsafe secrets rendered in frontend bundles. Test with admin, normal user and anonymous sessions; ensure no cross-account data leakage.

Preserve existing qualified-only export gates and real-data provider restrictions. Produce before/after screenshots for desktop and mobile in both themes. Execute an honest comparison against the current Vercel build. Do not claim live source searches or transactional emails are working without real provider checks.

After implementation report:
- Changed files and new routes.
- Visual/UX changes implemented.
- Results of each automated test and device viewport test.
- Auth and reset-email provider status.
- Vercel production/staging state and actual URL tested.
- Remaining blockers and the exact next operator actions.

Commit and push only after validating that no secrets or unreviewed private information are included, and follow repository instructions. Do not change source-license compliance in order to hide public provider names.
