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

Official blue #0866ed, navy #0b294c and white #ffffff come from the inherited project. Derived neutrals use OKLCH with a blue tint. Brand blue fills primary actions; a darker blue text token keeps links and selections readable on tinted surfaces. Semantic success/warning/error include text, never color alone. Light/Dark/System use the existing prepaint script, data-theme attribute and persistence. Dark backgrounds increase lightness with elevation; paired button ink changes for contrast. The official logo is preserved on a white plate in dark mode.

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
