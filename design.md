# LeadAtlas design system

The shared system for public, workspace and administrator screens. Change deliberately. `src/app/tokens.css` is the source of truth.

## Direction

- Genre: modern-minimal. Custom brand, full redesign.
- Idea: choose a business, judge its evidence, keep the contact.
- Tone: precise, focused, calm, credible research.
- Homepage: research index, with two distinct website finder paths.
- Workspace: persistent navigation, compact task heading, form or data first.
- Preserve the supplied LeadAtlas logo and all five feature names.

## Typography

Locally hosted Albert Sans variable, OFL licensed, one family throughout. Three weights: 400 text, 600 headings/actions, 700 reserved. Body 16px/1.65; labels/data 14px; metadata 13px. Workspace headings 28–32px. Homepage display up to 92px and section headings 48px, capped on wide screens. Sentence case, no tracked labels. Headings balance and wrap; data uses tabular figures.

## Color

Official blue #0866ed, navy #0b294c and white #ffffff come from the inherited project. Derived neutrals use OKLCH with a blue tint. Brand blue fills primary actions; a darker blue text token keeps links and selections readable on tinted surfaces. Semantic success/warning/error include text, never color alone. Light/Dark/System use the existing prepaint script, data-theme attribute and persistence. Dark backgrounds increase lightness with elevation; paired button ink changes for contrast. The approved transparent icon sits directly on the navigation surface in every theme, without a plate, filter or badge.

## Spacing and composition

4px rhythm with 2px optical nudge; role tokens in tokens.css. Public container 1280px with 40/24/20px responsive gutters. Workspace sidebar 264px and capped main content. Forms use 2 columns where comfortable and 1 on phones. Qualification guidance follows the form in a disclosure that starts closed. Tables are full width with horizontal rules; never repeated business cards. Marketing sections differ through typography, open index rows, a muted evidence surface and an actual product capture.

## Controls

Primary: solid blue, 6px radius, 44px minimum height. Secondary: neutral fill and visible border. Text actions use blue. Every keyboard target has an instant 2px focus ring. Inputs share button height, 16px text and a 3:1 visible edge. Native select/date/file/checkbox behavior remains. Disabled controls use the native attribute, cursor and opacity; an adjacent service notice explains unavailability. Destructive account deletion retains exact typed confirmation.

## Data and states

Search results retain name, email, qualification, evidence and save controls. On phones each table row becomes a labelled block with all fields and actions retained. History tables scroll within their region. Evidence is a Radix drawer with focus trapping and Escape. Existing pagination/filter state and API contracts are preserved; URL state and new sorting/bulk APIs are future work.

Loading uses nonanimated skeletons, empty views explain the next action, errors keep their alert semantics, success reflects actual server responses. No fake results or enabled services. The tour and its captured image remain explicitly synthetic and cannot export.

## Navigation and motion

Sidebar earned by nine workspace destinations; below 960px, use the existing accessible menu. Public links collapse into the same Radix menu. Motion is limited to 120ms hover feedback and 1px press transforms; no entrance choreography, gradients, looping decorations or animated layout. Reduced motion removes transitions. Content is visible without scripting.

## Exports

`src/app/tokens.css`, `src/app/base.css`, `src/app/globals.css`. No new runtime dependencies. Font and license: `public/fonts/`.

## Product corrections, 2026-11-04

The approved navigation identity is **`leadatlas-icon-v2.png`**, without the old wordmark. As corrected on 2026-11-05, the public PNG is byte-for-byte the original upload, including its transparent margins. Use the shared `Brand` component: 64px desktop canvas, 56px mobile, 40px footer; accessible link name “LeadAtlas home” and decorative empty image alt. Favicons/app icons at 16, 24, 32, 64, 180, 192 and 512px preserve the full square canvas and alpha channel. No cropping, white backing, filter, stretching or alternate responsive logo. The subdued 14px “Better leads. Less guesswork.” positioning statement appears in the public header and sidebar when space permits; it is hidden on small screens. Titles and metadata retain LeadAtlas.

Immediately after the hero, four discovery links form two columns in source order: With Websites, Without Websites, Domain Buyer Finder, New Business Finder. The second row aligns domains under with-websites and new-business under without-websites. On mobile all four stack in that order. Their existing copy and visual treatment are preserved. A separate “Find your next prospect.” directory follows, using the existing five horizontal feature rows, including Lead Management & Export. The directory precedes “A contact needs evidence.” Four discovery cards and five directory rows are separate components backed by the shared feature catalog.

Search controls share one accessible editable combobox. Country and region commit a predefined value; city and niche accept both a suggestion and arbitrary custom text. Changes of selected country/region clear the city and abort stale requests. Listboxes expose selected/active choices, arrow/Enter/Escape interaction, loading/error/empty states and visible source attribution. Popovers are anchored to their field, use the existing surface/tokens, and contain their scroll. Native form labels/required validation stay visible. Engineering candidate/query budgets are server defaults.

Domain research is a worldwide task, with a domain first, automatic strategy, portfolio upload, professional context and collapsed optional filters. Its table separates relationship strength from business/contact qualification. Evidence and email states never masquerade as buying intent. Dense columns use a named keyboard-scrollable table on small screens; no data disappears to make it fit.

## Homepage engagement, 2026-11-05

The updates form is a restrained two-column section after the existing FAQ, stacking on phones. Explicit unchecked consent, email label, busy state and meaningful server errors remain visible. Request recorded, pending confirmation and active subscription are different states; unavailable configuration disables signup honestly. Confirmation and unsubscribe pages require an explicit action. No decorative subscriber counts or invented social proof.

Testimonials form a simple text-led section only when approved, permissioned, past-dated records exist. Empty, loading and failed reads produce no empty public section. At most five are shown; names, business/role, exact approved text and publication dates are required. Optional self-hosted photographs require separate permission. The private administrator editor shares the existing form and table language.
