# MeatLens Landing Page Redesign

## Context

MeatLens is an image-based freshness inspection tool for wet-market food safety work. The landing page already contains the right product story: a public header, hero message and calls to action, a live analysis simulator, real landing statistics, an inspection feed, workflow, capabilities, CTA, and footer. The redesign should make these pieces read as one modern product surface while preserving their wording, routes, and interactions.

## Direction

Use a Swiss field-inspection interface rather than a dark console. The landing page will use a pure white or neutral `#F7F7F8` surface, dark ink typography, Helvetica/Arial-style sans typography, International Orange `#FF4F00` as the single design accent, and visible 1 px hairline rules. The result should feel like an evidence board or inspection form: precise, calm, editorial, and credible.

The visual differentiator is a flat inspection instrument in the hero. The existing simulator remains interactive, but its selected sample, scan progress, and result state will be presented through a clean framed instrument with orange scan guides and high-contrast measured values instead of a dark rounded phone shell.

## Scope and structure

1. **Landing shell and header**
   - Keep the sticky header, MeatLens identity, responsive menu, sign-in state, and app links.
   - Replace translucent dark/glass styling with a white header, hairline bottom rule, compact brand mark, and clear orange primary action.
   - Preserve `Open App`, `Sign In`, and `Get Started` labels and route behavior.

2. **Hero and simulator**
   - Keep the existing hero headline, supporting paragraph, CTAs, animated stats, and simulator state machine unchanged in meaning and behavior.
   - Use an asymmetric two-column composition at large widths, with left-aligned copy and an instrument panel on the right.
   - Use a restrained ruled grid, orange corner markers, clear result status, and larger confidence numerals as the hero signature.

3. **Inspection feed**
   - Keep all existing feed items, result colors, confidence values, scope labels, and market names.
   - Restyle the ticker as a single ruled data rail with readable chips and edge fades, avoiding heavy rounded cards.

4. **Workflow and capability sections**
   - Keep the four workflow steps and four capability blocks.
   - Use numbered columns, hairline dividers, sparse icon treatment, and a small set of consistent surfaces instead of nested glassmorphism.
   - Preserve semantic status colors in the simulator and feed because they communicate inspection outcomes, not decorative theme accents.

5. **CTA and footer**
   - Keep the existing CTA wording, signed-in branching, routes, and footer copy.
   - Make the CTA a high-contrast orange editorial block with dark type and a clear action hierarchy.

## Styling system

- Surface: `#FFFFFF` and neutral `#F7F7F8`; no dark landing surfaces, grain, or CRT effects.
- Ink: near-black text and cool neutral rules for legibility.
- Accent: `#FF4F00`, used for primary actions, active states, scan guides, and key folios.
- Typography: one sans family for the landing page, preferring `Helvetica Neue`, `Helvetica`, `Arial`, and `sans-serif`; use weight and size rather than a second display family.
- Structure: 1 px rules, visible section boundaries, left alignment, asymmetric spacing, and restrained corner radii.
- Motion: retain useful scan/ticker/count-up motion, add only subtle hover movement, and honor reduced-motion preferences.

## Constraints

- Do not rewrite landing-page copy.
- Do not remove or rename existing routes, ids, sections, or simulator controls.
- Do not change app-wide authenticated dark-mode behavior.
- Do not introduce fabricated statistics, telemetry, or testimonials.
- Keep responsive behavior usable on small screens and maintain keyboard focus visibility.

## Verification

- Run frontend typecheck, lint, and production build.
- Inspect the rendered landing page at desktop and mobile widths.
- Verify simulator selection, scan progress, result state, CTA routing, sticky header menu, and signed-in branching remain intact.
- Confirm the landing route resolves to the light theme and that no dark landing-only surfaces remain.

## Commit sequence

The implementation will be delivered in focused commits:

1. Add and approve this redesign specification.
2. Establish landing-only Swiss visual tokens and shell styling.
3. Redesign the header, hero, and interactive simulator presentation.
4. Redesign the ticker, workflow, and capability sections.
5. Redesign the CTA, footer, responsive polish, and accessibility states.
6. Apply verification fixes if needed and record the final validated state.
