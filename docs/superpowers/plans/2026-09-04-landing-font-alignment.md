# Landing Page Font Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the landing page use the application typography tokens while preserving its current visual design.

**Architecture:** Keep typography scoped to `.landing-page` in the existing page stylesheet. Use `var(--font-body)` for inherited landing content and `var(--font-display)` for headings, matching the global base rules without changing components or layout.

**Tech Stack:** React, TypeScript, CSS, Node test runner via `tsx`, ESLint, Vite.

## Global Constraints

- Preserve the landing page’s existing green-and-white palette, layout, spacing, content, and responsive behavior.
- Use the existing `--font-body` and `--font-display` tokens; do not introduce a new font family or dependency.
- Stage only landing typography files and the plan/spec artifacts; preserve unrelated worktree changes.

---

### Task 1: Align landing typography with system tokens

**Files:**
- Modify: `frontend/src/pages/public/landing-page.css:1-15`
- Modify: `frontend/tests/unit/features/public-landing/landing-visual-system.unit.test.ts:14-18`

**Interfaces:**
- Consumes: Global CSS variables `--font-body` and `--font-display` from `frontend/src/app/styles/globals.css`.
- Produces: A landing-page stylesheet whose body and control text inherits `var(--font-body)` and whose headings use `var(--font-display)`.

- [ ] **Step 1: Write the failing typography contract test**

Replace the old Helvetica assertion in `frontend/tests/unit/features/public-landing/landing-visual-system.unit.test.ts` with:

```ts
test("landing page uses the system typography tokens", () => {
  assert.match(landingStylesSource, /font-family: var\(--font-body\);/);
  assert.match(
    landingStylesSource,
    /:where\(h1, h2, h3, h4, h5, h6\) \{\s+font-family: var\(--font-display\);/,
  );
  assert.doesNotMatch(landingStylesSource, /Helvetica Neue/);
});
```

- [ ] **Step 2: Run the targeted test and verify it fails for the old override**

Run from `frontend`:

```powershell
npm run test:unit -- tests/unit/features/public-landing/landing-visual-system.unit.test.ts
```

Expected: the test fails because the landing stylesheet currently contains the Helvetica declaration and does not contain the required `var(--font-body)` / `var(--font-display)` mapping.

- [ ] **Step 3: Implement the minimal CSS change**

In `frontend/src/pages/public/landing-page.css`, change the page font declaration to:

```css
font-family: var(--font-body);
```

Replace the broad selector rule with:

```css
.landing-page :where(h1, h2, h3, h4, h5, h6) {
  font-family: var(--font-display);
}

.landing-page :where(button, a, label) {
  font-family: var(--font-body);
}
```

Leave every existing color, spacing, focus, motion, and responsive rule unchanged.

- [ ] **Step 4: Run targeted verification**

Run from `frontend`:

```powershell
npm run test:unit -- tests/unit/features/public-landing/landing-visual-system.unit.test.ts
npm run typecheck
npm run lint
npm run build
```

Expected: all commands exit successfully; the build completes and no unrelated files are staged.

- [ ] **Step 5: Commit the implementation**

From the repository root, stage only the plan, stylesheet, and test, then commit:

```powershell
git add -f -- docs/superpowers/plans/2026-09-04-landing-font-alignment.md
git add -- frontend/src/pages/public/landing-page.css frontend/tests/unit/features/public-landing/landing-visual-system.unit.test.ts
git diff --cached --check
git commit -m "fix: align landing page typography"
```
