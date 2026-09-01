# MeatLens Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the existing MeatLens public landing page into a white Swiss field-inspection interface while preserving all current wording, routes, sections, simulator behavior, and real product information.

**Architecture:** Keep the current `pages/public` and `widgets/public-landing` composition. Add landing-only visual tokens and reduced-motion behavior in the global stylesheet, then update the existing presentational components in five independently reviewable slices: shell, hero, simulator/feed, workflow/features, and CTA/footer. Do not change authentication, routing, backend contracts, or authenticated theme behavior.

**Tech Stack:** React 18, TypeScript, React Router, Tailwind CSS, shadcn-style shared UI primitives, lucide-react, Vite, and Node test runner via `tsx`.

## Global Constraints

- Use a pure white or neutral `#F7F7F8` landing surface; do not add dark landing surfaces, grain, or CRT effects.
- Use dark ink typography with Helvetica/Arial-style sans typography for the landing page.
- Use International Orange `#FF4F00` as the single design accent for landing actions and active states.
- Preserve all existing landing-page wording exactly.
- Do not remove or rename existing routes, ids, sections, or simulator controls.
- Do not change app-wide authenticated dark-mode behavior.
- Do not introduce fabricated statistics, telemetry, testimonials, or claims.
- Preserve semantic freshness result colors because they communicate inspection outcomes.
- Keep responsive behavior usable on small screens and preserve visible keyboard focus states.
- Honor `prefers-reduced-motion` for ticker, scan-line, count-up, and hover motion.

## File map

- `frontend/src/pages/public/landing-page.tsx`: page shell, section order, landing-only surface treatment.
- `frontend/src/widgets/public-landing/ui/landing-header.tsx`: sticky navigation, brand identity, responsive menu, auth-aware actions.
- `frontend/src/widgets/public-landing/ui/hero-section.tsx`: hero copy, CTAs, stats, and simulator placement.
- `frontend/src/widgets/public-landing/ui/animated-stat.tsx`: real landing metric presentation.
- `frontend/src/widgets/public-landing/ui/simulator.tsx`: interactive sample selection, scan progress, and result presentation.
- `frontend/src/widgets/public-landing/ui/log-ticker.tsx`: repeated inspection-feed rail.
- `frontend/src/widgets/public-landing/ui/workflow-section.tsx`: four-step inspection sequence.
- `frontend/src/widgets/public-landing/ui/features-section.tsx`: four capability blocks.
- `frontend/src/widgets/public-landing/ui/bottom-cta-section.tsx`: final signed-in/anonymous CTA.
- `frontend/src/widgets/public-landing/ui/landing-footer.tsx`: footer identity and description.
- `frontend/src/app/styles/globals.css`: landing-only font/surface tokens and reduced-motion fallback.
- `frontend/tests/unit/features/public-landing/public-landing-ownership.unit.test.tsx`: ownership/content invariants.

---

### Task 1: Establish the landing-only Swiss shell and visual tokens

**Files:**
- Modify: `frontend/src/pages/public/landing-page.tsx`
- Modify: `frontend/src/app/styles/globals.css`
- Test: `frontend/tests/unit/features/public-landing/public-landing-ownership.unit.test.tsx`

**Interfaces:**
- Consumes: existing `LandingHeader`, `HeroSection`, `LogTicker`, `WorkflowSection`, `FeaturesSection`, `BottomCtaSection`, `LandingFooter`, and `useLandingStats` exports.
- Produces: the same `LandingPage` export and identical section order/data flow, plus the `landing-page` class used by later slices.

- [ ] **Step 1: Run the current ownership test before editing**

Run from the repository root:

```powershell
npm run test:unit -w frontend -- --test-name-pattern="public landing"
```

Expected: all matching public-landing tests pass.

- [ ] **Step 2: Add landing-only tokens without changing app themes**

Append a `landing-page` rule inside `@layer components` in `globals.css`:

```css
.landing-page {
  --landing-surface: #ffffff;
  --landing-surface-muted: #f7f7f8;
  --landing-ink: #17191c;
  --landing-ink-muted: #5d6570;
  --landing-rule: #d9dee5;
  --landing-accent: #ff4f00;
  background: var(--landing-surface);
  color: var(--landing-ink);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
}

.landing-page :where(h1, h2, h3, h4, h5, h6, button, a, label) {
  font-family: inherit;
}

.landing-page :where(button, a, [role="button"]):focus-visible {
  outline: 2px solid var(--landing-accent);
  outline-offset: 3px;
}
```

Keep the existing root theme variables unchanged so authenticated dark mode is unaffected.

- [ ] **Step 3: Replace shell decoration with a white ruled page**

In `landing-page.tsx`, add `landing-page` to the root class, remove both blurred absolute color blobs, and keep the existing section order:

```tsx
<div className="landing-page min-h-screen overflow-x-hidden selection:bg-orange-100">
  <LandingHeader isSignedIn={isSignedIn} />
  <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <HeroSection isSignedIn={isSignedIn} statCards={statCards} />
    <LogTicker />
    <WorkflowSection />
    <FeaturesSection />
    <BottomCtaSection isSignedIn={isSignedIn} />
  </main>
  <LandingFooter />
</div>
```

Do not alter the `isSignedIn` calculation, stats hook, or component order.

- [ ] **Step 4: Run shell verification**

Run:

```powershell
npm run typecheck -w frontend
npm run test:unit -w frontend -- --test-name-pattern="public landing"
```

Expected: both commands pass with no route/export changes.

- [ ] **Step 5: Commit the shell slice**

```powershell
git add frontend/src/pages/public/landing-page.tsx frontend/src/app/styles/globals.css frontend/tests/unit/features/public-landing/public-landing-ownership.unit.test.tsx
git commit -m "feat: establish white landing page shell"
```

### Task 2: Redesign the header, hero hierarchy, and stats

**Files:**
- Modify: `frontend/src/widgets/public-landing/ui/landing-header.tsx`
- Modify: `frontend/src/widgets/public-landing/ui/hero-section.tsx`
- Modify: `frontend/src/widgets/public-landing/ui/animated-stat.tsx`

**Interfaces:**
- Consumes: existing `isSignedIn`, `statCards`, Link destinations, Button/Sheet primitives, and Fingerprint/ChevronRight/Menu/Sparkles icons.
- Produces: unchanged component exports, labels, ids, auth branches, CTA routes, and `AnimatedStat` props.

- [ ] **Step 1: Preserve header behavior while replacing visual styling**

Keep the current JSX branches and labels. Update only classes so the header uses `border-b border-[#d9dee5] bg-white/95`, a compact rectangular brand mark with a thin orange rule, dark ink text, and an orange filled primary action. Keep mobile `Sheet`, `SheetClose`, `/inspect`, `/login`, and `/signup` destinations intact.

- [ ] **Step 2: Compose the hero as an asymmetric editorial grid**

Keep the exact current headline, paragraph, CTA labels, CTA ids, Link routes, `statCards.map`, and `<Simulator />`. Replace the pill badge and gradient headline span with an inline status row and a single orange accent span. Use a left-aligned `lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]` layout, a thin top rule above stats, and no decorative background blobs.

The retained CTA structure must remain equivalent to:

```tsx
<Link to={isSignedIn ? "/inspect" : "/signup"}>
  <Button id="btn-hero-inspect">{isSignedIn ? "Start Inspecting" : "Create Inspector Account"}</Button>
</Link>
<Link to={isSignedIn ? "/history" : "/login"}>
  <Button id="btn-hero-history" variant="outline">{isSignedIn ? "View History" : "Sign In"}</Button>
</Link>
```

- [ ] **Step 3: Make stats read as measured evidence**

Keep `useCountUp(rawValue)`, `toLocaleString()`, suffix rendering, and labels. Change presentation to left-aligned metric cells with tabular numerals, a large dark value, and a small neutral label. Do not add new metric values or labels.

- [ ] **Step 4: Run the focused checks**

Run:

```powershell
npm run typecheck -w frontend
npm run lint -w frontend
npm run test:unit -w frontend -- --test-name-pattern="public landing"
```

Expected: PASS for all three commands.

- [ ] **Step 5: Commit the header/hero slice**

```powershell
git add frontend/src/widgets/public-landing/ui/landing-header.tsx frontend/src/widgets/public-landing/ui/hero-section.tsx frontend/src/widgets/public-landing/ui/animated-stat.tsx
git commit -m "feat: sharpen MeatLens landing hero"
```

### Task 3: Turn the simulator and feed into the inspection instrument

**Files:**
- Modify: `frontend/src/widgets/public-landing/ui/simulator.tsx`
- Modify: `frontend/src/widgets/public-landing/ui/log-ticker.tsx`

**Interfaces:**
- Consumes: existing `selectedIdx`, `scanning`, `scannedResult`, `scanStep`, `landingMockSamples`, `tickerItems`, and scan interval behavior.
- Produces: unchanged scan transitions, sample selection, result values, status colors, item data, and `btn-simulator-scan` id.

- [ ] **Step 1: Add simulator accessibility semantics before visual edits**

Add `aria-pressed={selectedIdx === index}` to each sample selector button and `aria-live="polite"` to the scan/result panel. Keep `disabled={scanning}` and the current button text branches so the interaction remains understandable without visual styling.

- [ ] **Step 2: Replace the phone/glass shell with a flat instrument panel**

Keep the simulator component state and event handler unchanged. Replace the outer `rounded-[2.5rem] border-[8px] shadow-2xl backdrop-blur-xl` treatment with a modest-radius white or `#f7f7f8` panel, a dark hairline frame, compact instrument header, rectangular preview window, and ruled result area. Preserve the sample buttons, scan line, corner brackets, progress bar, confidence percentage, semantic status colors, scope label, and result text.

Use `#FF4F00` for scan guides and active controls; do not use green as the landing visual accent outside semantic result states.

- [ ] **Step 3: Make the feed a single ruled inspection rail**

Keep `useMemo`, the doubled array, ticker keyframe, item labels, status dot class mapping, confidence values, scope labels, and markets. Replace dark/glass classes (`border-white/5`, `bg-card/30`, `bg-background/60`, `backdrop-blur-md`) with white/neutral surfaces, `border-[#d9dee5]`, and rectangular chips. Retain edge fades using white gradients. Keep the existing displayed wording and separator exactly as-is.

- [ ] **Step 4: Run simulator/feed checks**

Run:

```powershell
npm run typecheck -w frontend
npm run lint -w frontend
npm run test:unit -w frontend -- --test-name-pattern="public landing"
```

Expected: PASS; no component export or state-transition errors.

- [ ] **Step 5: Commit the instrument slice**

```powershell
git add frontend/src/widgets/public-landing/ui/simulator.tsx frontend/src/widgets/public-landing/ui/log-ticker.tsx
git commit -m "feat: refine landing inspection instrument"
```

### Task 4: Rebuild workflow and capability sections around the ruled grid

**Files:**
- Modify: `frontend/src/widgets/public-landing/ui/workflow-section.tsx`
- Modify: `frontend/src/widgets/public-landing/ui/features-section.tsx`

**Interfaces:**
- Consumes: unchanged `landingWorkflow` and `landingFeatures` arrays, Lucide icon components, and existing title/description strings.
- Produces: unchanged four workflow steps and four capability blocks with no new data contract.

- [ ] **Step 1: Remove fabricated capability percentages from presentation**

Delete the local `mockConfidenceScores` array and its `Accuracy Index` progress bars from `features-section.tsx`. Keep each mapped feature icon, title, and description. Replace the removed row with a simple bottom rule or spacing so no invented number remains on the page.

- [ ] **Step 2: Make workflow a connected four-step sequence**

Keep the existing map and order. Use a desktop grid with hairline separators and a subtle connector line behind the steps; use stacked rectangular blocks on mobile. Keep the visible numbers and titles, ensure the number is `aria-hidden="true"` if it duplicates the title/order, and preserve all existing descriptions.

- [ ] **Step 3: Restyle capability blocks without changing content**

Keep the two-column desktop and one-column mobile layout. Use white cards on the neutral landing surface, dark ink headings, sparse orange icon treatment, and consistent `border-[#d9dee5]` rules. Replace rounded glass panels and heavy hover shadows with restrained border/color changes.

- [ ] **Step 4: Run section checks**

Run:

```powershell
npm run typecheck -w frontend
npm run lint -w frontend
npm run test:architecture -w frontend
```

Expected: all commands pass with no new source-boundary or source-size violations.

- [ ] **Step 5: Commit the workflow/features slice**

```powershell
git add frontend/src/widgets/public-landing/ui/workflow-section.tsx frontend/src/widgets/public-landing/ui/features-section.tsx
git commit -m "feat: structure landing workflow and capabilities"
```

### Task 5: Finish CTA/footer, motion accessibility, and responsive polish

**Files:**
- Modify: `frontend/src/widgets/public-landing/ui/bottom-cta-section.tsx`
- Modify: `frontend/src/widgets/public-landing/ui/landing-footer.tsx`
- Modify: `frontend/src/app/styles/globals.css`

**Interfaces:**
- Consumes: existing `isSignedIn`, CTA routes, CTA labels, Fingerprint icon, footer copy, ticker keyframe, and scan-line animation.
- Produces: unchanged signed-in/anonymous branches and final page identity, with landing motion disabled for reduced-motion users.

- [ ] **Step 1: Reframe the final CTA as the accent block**

Keep the exact current copy, `isSignedIn` branch, and `/inspect`, `/signup`, `/login` routes. Replace the glow/radial background with a solid International Orange panel, dark or white button contrast as needed, and a visible rectangular secondary action. Preserve the existing button labels.

- [ ] **Step 2: Tighten the footer**

Keep Fingerprint, MeatLens, and the existing footer sentence. Use a top hairline rule, white surface, dark/neutral text, compact spacing, and a stacked mobile layout. Do not add new navigation or legal copy.

- [ ] **Step 3: Add landing motion reduction**

Add this rule after the existing animation declarations in `globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .landing-page *,
  .landing-page *::before,
  .landing-page *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

Do not remove the normal ticker, scan-line, count-up, or hover motion for users who have not requested reduced motion.

- [ ] **Step 4: Run the full frontend verification set**

Run:

```powershell
npm run lint -w frontend
npm run typecheck -w frontend
npm run test:unit -w frontend
npm run test:component -w frontend
npm run build:frontend
```

Expected: all commands pass and Vite produces a production build.

- [ ] **Step 5: Inspect responsive behavior and interactions**

Run `npm run dev:frontend`, inspect `/` at approximately 1440px and 390px widths, and verify:

1. The route is white/neutral and uses the landing-only Helvetica/Arial system.
2. Header actions, mobile menu, signed-in branches, and CTA links retain their destinations.
3. Sample selection, scan progress, result state, confidence value, and scope labels remain functional.
4. All existing sections remain in the original order.
5. The feed does not create horizontal page overflow on mobile.
6. Keyboard focus is visible on header actions, menu trigger, CTAs, sample buttons, and scan control.
7. Reduced motion stops ticker/scan/hover animation while preserving readable state changes.

- [ ] **Step 6: Commit the final polish slice**

```powershell
git add frontend/src/widgets/public-landing/ui/bottom-cta-section.tsx frontend/src/widgets/public-landing/ui/landing-footer.tsx frontend/src/app/styles/globals.css
git commit -m "feat: finish MeatLens landing page polish"
```

## Self-review

- Spec coverage: shell, header, hero, simulator, feed, workflow, capabilities, CTA, footer, typography, palette, motion, responsive behavior, and verification are all mapped above.
- Placeholder scan: no unfinished markers or vague implementation-only instruction is used.
- Type consistency: all tasks preserve the current component names, prop shapes, landing data exports, route destinations, and simulator state variables.
- Scope: no backend, auth, router, global theme-token, model, or logo changes are planned.
- Commit count: the approved spec commit plus five implementation commits satisfies the requested minimum of five commits.
