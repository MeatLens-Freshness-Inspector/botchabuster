# MeatLens Landing Page Redesign

## Purpose

Improve the public MeatLens landing page so it communicates image-based freshness inspection with more energy, hierarchy, and product clarity while preserving the existing MeatLens-owned brand system.

The Lime / Sport reference contributes layout and interaction principles only: tighter rhythm, framed modules, scoreboard-like information grouping, visible rules, and purposeful density. It does not contribute colors, fonts, logo treatment, copy, or brand vocabulary.

## Non-negotiable brand constraints

- Preserve the existing MeatLens dark and light theme behavior and token values in `frontend/src/app/styles/globals.css`.
- Preserve `JetBrains Mono` as the display/label family and `Inter` as the body family.
- Preserve the existing MeatLens wordmark treatment and Fingerprint icon mark.
- Do not add lime-specific colors, gradients, fonts, logo assets, or decorative brand copy.
- Keep the existing landing content model and route destinations intact.

## Current landing content to retain

The page continues to include:

1. Sticky landing header with signed-in and signed-out actions.
2. Hero copy, primary/secondary CTAs, animated landing stats, and interactive simulator.
3. Inspection result ticker.
4. Four-step inspection workflow.
5. Four capability cards.
6. Testimonials.
7. Final call-to-action section.
8. Footer.

Existing copy and data remain the source of truth. No fabricated operational metrics, user identities, or new claims should be introduced.

## Visual direction

### Composition

- Replace the current uniformly rounded, floating-glass treatment with a more deliberate framed-module system.
- Use rectangular or lightly rounded panels with stronger MeatLens borders and fewer oversized corner radii.
- Introduce section markers, numbered rails, compact metric bands, and divider rules to create a clear vertical inspection rhythm.
- Keep the hero asymmetric on desktop: copy and actions on the left, simulator on the right, with the simulator visually treated as the featured instrument.
- On mobile, stack in reading order and keep all controls full-width or comfortably tappable.

### Color and texture

- Use only existing semantic classes and CSS variables: `background`, `foreground`, `card`, `muted`, `border`, `primary`, `accent`, `fresh`, `acceptable`, `warning`, and `spoiled`.
- Keep green as MeatLens’s primary signal and amber as the existing supporting signal.
- Use subtle existing-token overlays sparingly. Avoid introducing new brand colors or a lime accent layer.
- Use borders, rules, and small status fills for visual texture instead of adding grain, sport patterns, or unrelated gradients.

### Typography

- Keep `font-display` / JetBrains Mono for headings, labels, status, metric numerals, and action labels.
- Keep `font-body` / Inter for explanatory copy and longer text.
- Preserve the existing uppercase display language where it already exists, but remove any newly introduced filler labels.
- Use tabular numerals for confidence and stats where useful.

## Component-level design

### Landing header

- Preserve the Fingerprint mark and MeatLens identity.
- Keep sticky behavior and existing signed-in branching.
- Tighten the header into a compact bordered band with stronger focus states and less glass blur.
- Keep mobile menu behavior and existing routes.

### Hero and simulator

- Keep the current hero copy, CTAs, stat cards, and simulator behavior.
- Rebalance the hero around a clear headline block, compact supporting text, action row, and a three-column stat strip.
- Frame the simulator with a visible MeatLens border and a clear “live demo” hierarchy.
- Improve simulator controls with explicit selected and disabled states, accessible labels, and reduced-motion-safe scanning feedback.
- Keep the simulated results as authored sample content and label them as a demo where appropriate.

### Ticker

- Retain the current inspection item data and animated ticker behavior.
- Present the ticker as a full-width inspection log band with stronger rule lines and status colors.
- Ensure animation pauses or reduces under `prefers-reduced-motion`.

### Workflow

- Keep four existing workflow steps and icons.
- Render them as a connected inspection sequence with step numbers, short descriptions, and consistent border treatment.
- Preserve semantic heading hierarchy and focus visibility if any step becomes interactive.

### Capabilities

- Keep four existing feature descriptions and icons.
- Replace mock “Accuracy Index” treatment if it implies measured feature-level accuracy not supported by the data. If retained visually, it must be clearly presented as authored product framing rather than a factual benchmark; preferred implementation is to remove the fabricated confidence values and use a concise capability detail row instead.
- Use a dense two-column desktop grid and single-column mobile layout.

### Testimonials

- Retain the existing section and content source.
- Improve hierarchy with a featured quote treatment and supporting quote cards without changing the claims or names.
- Keep rating semantics accessible; avoid relying on decorative symbols as the only rating information.

### Final CTA and footer

- Keep route behavior and signed-in branching unchanged.
- Use a high-contrast MeatLens primary panel with a restrained status-color edge treatment rather than a new accent palette.
- Preserve the footer wordmark and product description.

## Accessibility and responsive behavior

- Preserve semantic sections, heading order, and link/button semantics.
- Every interactive element must have a visible keyboard focus state using the existing ring token.
- Maintain at least comfortable touch targets for mobile actions and simulator sample selectors.
- Respect `prefers-reduced-motion` for ticker, scan-line, reveal, and hover transforms.
- Keep text contrast legible in both existing themes.
- Avoid horizontal overflow at narrow widths and test the page at mobile, tablet, and desktop breakpoints.

## Implementation boundaries

- Expected primary edits: `frontend/src/pages/public/landing-page.tsx` and the components under `frontend/src/widgets/public-landing/ui/`.
- Do not modify global theme tokens, font imports, or shared logo identity unless verification reveals an existing landing-specific defect.
- Reuse existing shared Button, Sheet, and icon primitives.
- Do not change backend contracts, authentication flows, or landing route paths.

## Verification

- Run the frontend typecheck and lint commands.
- Run the public landing ownership unit test and relevant landing component tests.
- Build the frontend.
- If the local browser harness is available, inspect the landing page at narrow and wide viewports and verify the simulator interactions, mobile menu, CTAs, focus states, and reduced-motion behavior.

## Success criteria

The landing page feels materially more structured and distinctive, with a clear inspection-scoreboard rhythm and stronger hierarchy, while a MeatLens user still recognizes the same theme, fonts, Fingerprint logo, content, routes, and product story immediately.
