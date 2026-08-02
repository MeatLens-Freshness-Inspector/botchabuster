# Test Architecture Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the BotchaBuster test suite into a layered, domain-oriented architecture with reusable support modules, a test-safe backend app factory, shared contracts, and CI lanes that reflect the new test boundaries.

**Architecture:** The migration stays incremental and mechanical first: move tests into the right layers and domains before deepening support architecture. Backend testability improves through an extracted `createApp()` entry point and narrow seams around runtime-heavy dependencies, while frontend coverage shifts low-level Playwright checks into unit, component, and integration suites. Root-level contracts, fixtures, and CI scripts tie the workspaces together without changing the repo into separate services.

**Tech Stack:** TypeScript, Node test runner via `tsx --test`, React Testing Library, Playwright, Express, npm workspaces, GitHub Actions

## Global Constraints

- The repository must remain runnable after each migration slice.
- Existing behavior and coverage should be preserved while files move.
- The work will happen in a dedicated git worktree and be delivered as many small commits rather than one monolithic change.
- Playwright should only cover real user journeys or browser-specific regressions by the end of the migration.
- New abstractions are allowed only when they solve a concrete test architecture or dependency-boundary problem.
- Move first, improve second.
- Organize tests first by test level, then by business domain or behavior.
- Do not change Android native test layout.
- Do not use the real training dataset as an application-test fixture.

---

## File Structure Map

### Root shared test files

- Create: `tests/contracts/api-contract.test.ts`
- Create: `tests/contracts/schemas/analysis-response.schema.ts`
- Create: `tests/contracts/schemas/error-response.schema.ts`
- Create: `tests/contracts/schemas/inspection.schema.ts`
- Create: `tests/fixtures/README.md`
- Create: `tests/fixtures/images/.gitkeep`
- Create: `tests/fixtures/payloads/.gitkeep`
- Create: `tests/smoke/critical-route.spec.ts`
- Create: `tests/smoke/production-health.spec.ts`

### Backend structure and runtime files

- Create: `backend/src/app.ts`
- Modify: `backend/src/server.ts`
- Create: `backend/tests/setup/env.ts`
- Create: `backend/tests/setup/lifecycle.ts`
- Create: `backend/tests/support/appFactory.ts`
- Create: `backend/tests/support/authFactory.ts`
- Create: `backend/tests/support/requestFactory.ts`
- Create: `backend/tests/support/fixtures.ts`
- Create: `backend/tests/support/modelFake.ts`
- Create: `backend/tests/support/supabaseFake.ts`
- Create: `backend/tests/infrastructure/model-runtime/.gitkeep`
- Create: `backend/tests/infrastructure/storage/.gitkeep`
- Create: `backend/tests/infrastructure/supabase/.gitkeep`
- Create: `backend/tests/infrastructure/email/.gitkeep`

### Frontend structure files

- Create: `frontend/tests/component/analysis/.gitkeep`
- Create: `frontend/tests/component/auth/.gitkeep`
- Create: `frontend/tests/component/inspections/.gitkeep`
- Create: `frontend/tests/component/shared/.gitkeep`
- Create: `frontend/tests/integration/api/.gitkeep`
- Create: `frontend/tests/integration/camera/.gitkeep`
- Create: `frontend/tests/integration/offline/.gitkeep`
- Create: `frontend/tests/integration/storage/.gitkeep`
- Create: `frontend/tests/support/api/.gitkeep`
- Create: `frontend/tests/support/auth/.gitkeep`
- Create: `frontend/tests/support/factories/.gitkeep`
- Create: `frontend/tests/support/fixtures/.gitkeep`
- Create: `frontend/tests/support/page-objects/.gitkeep`
- Modify: `frontend/playwright.config.ts`
- Modify: `frontend/package.json`

### Root automation files

- Modify: `.gitignore`
- Modify: `package.json`
- Create: `.github/workflows/test-architecture.yml`

## Task 1: Scaffold Shared Test Directories And Ignore Generated Output

**Files:**
- Modify: `.gitignore`
- Create: `tests/contracts/.gitkeep`
- Create: `tests/contracts/schemas/.gitkeep`
- Create: `tests/fixtures/README.md`
- Create: `tests/fixtures/images/.gitkeep`
- Create: `tests/fixtures/payloads/.gitkeep`
- Create: `tests/smoke/.gitkeep`

**Interfaces:**
- Consumes: existing root npm workspace layout and current Playwright output directories
- Produces: root shared test directories and ignore rules that later tasks can populate without polluting Git status

- [ ] **Step 1: Write the failing test**

```ts
// tests/fixtures/README.md is documentation-only for this task.
// The executable assertion for this task is a Git status check:
// generated Playwright outputs should not appear as tracked changes
// after reports are regenerated.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `git check-ignore frontend/playwright-report frontend/test-results test-results coverage .nyc_output`
Expected: one or more paths are not ignored yet

- [ ] **Step 3: Write minimal implementation**

```gitignore
# hidden files
docs
.worktrees/

# test output
frontend/playwright-report/
frontend/test-results/
test-results/
coverage/
.nyc_output/
tests/fixtures/images/*
!tests/fixtures/images/.gitkeep
tests/fixtures/payloads/*
!tests/fixtures/payloads/.gitkeep
```

```md
# Shared Test Fixtures

This directory stores tiny, deterministic application-test fixtures.

- `images/` is for curated upload fixtures grouped by purpose.
- `payloads/` is for JSON or text payloads shared across contract, smoke, or integration tests.

Do not copy the training dataset here. Every fixture should exist for a documented application-test reason.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `git check-ignore frontend/playwright-report frontend/test-results test-results coverage .nyc_output`
Expected: every path is reported as ignored

Run: `git status --short`
Expected: only the new scaffold files appear

- [ ] **Step 5: Commit**

```bash
git add .gitignore tests/fixtures/README.md tests/fixtures/images/.gitkeep tests/fixtures/payloads/.gitkeep tests/contracts/.gitkeep tests/contracts/schemas/.gitkeep tests/smoke/.gitkeep
git commit -m "test: scaffold shared test architecture roots"
```

## Task 2: Reorganize Backend Unit And Integration Tests By Domain

**Files:**
- Create: `backend/tests/unit/auth/`
- Create: `backend/tests/unit/config/`
- Create: `backend/tests/unit/developer/`
- Create: `backend/tests/unit/inspections/`
- Create: `backend/tests/unit/reports/`
- Create: `backend/tests/unit/shared/.gitkeep`
- Create: `backend/tests/integration/admin/`
- Create: `backend/tests/integration/auth/`
- Create: `backend/tests/integration/developer/`
- Create: `backend/tests/integration/security/`
- Create: `backend/tests/integration/analysis/.gitkeep`
- Create: `backend/tests/integration/inspections/.gitkeep`
- Move: `backend/tests/unit/AppSessionService.test.ts` -> `backend/tests/unit/auth/app-session-service.unit.test.ts`
- Move: `backend/tests/unit/CsrfTokenService.test.ts` -> `backend/tests/unit/auth/csrf-token-service.unit.test.ts`
- Move: `backend/tests/unit/PasskeyCeremonyStore.test.ts` -> `backend/tests/unit/auth/passkey-ceremony-store.unit.test.ts`
- Move: `backend/tests/unit/SessionLimitService.test.ts` -> `backend/tests/unit/auth/session-limit-service.unit.test.ts`
- Move: `backend/tests/unit/requestAuth.test.ts` -> `backend/tests/unit/auth/request-auth.unit.test.ts`
- Move: `backend/tests/unit/sessionCookieSecurity.test.ts` -> `backend/tests/unit/auth/session-cookie-security.unit.test.ts`
- Move: `backend/tests/unit/appSessionConfig.test.ts` -> `backend/tests/unit/config/app-session-config.unit.test.ts`
- Move: `backend/tests/unit/supabaseConfig.test.ts` -> `backend/tests/unit/config/supabase-config.unit.test.ts`
- Move: `backend/tests/unit/developerDashboardImportValidation.test.ts` -> `backend/tests/unit/developer/dashboard-import-validation.unit.test.ts`
- Move: `backend/tests/unit/developerDatasetExport.test.ts` -> `backend/tests/unit/developer/dataset-export.unit.test.ts`
- Move: `backend/tests/unit/developerRolePropagation.test.ts` -> `backend/tests/unit/developer/role-propagation.unit.test.ts`
- Move: `backend/tests/unit/inspectionCoordinates.test.ts` -> `backend/tests/unit/inspections/coordinates.unit.test.ts`
- Move: `backend/tests/unit/inspectionPreScan.test.ts` -> `backend/tests/unit/inspections/pre-scan.unit.test.ts`
- Move: `backend/tests/unit/reportOrganization.test.ts` -> `backend/tests/unit/reports/report-organization.unit.test.ts`
- Move: `backend/tests/integration/adminAuthStatusPropagation.test.ts` -> `backend/tests/integration/admin/status-propagation.integration.test.ts`
- Move: `backend/tests/integration/authCookieSession.test.ts` -> `backend/tests/integration/auth/cookie-session.integration.test.ts`
- Move: `backend/tests/integration/developerDashboardAuth.test.ts` -> `backend/tests/integration/developer/dashboard-auth.integration.test.ts`
- Move: `backend/tests/integration/errorMiddleware.test.ts` -> `backend/tests/integration/security/error-middleware.integration.test.ts`
- Move: `backend/tests/integration/serverSecurityHardening.test.ts` -> `backend/tests/integration/security/server-hardening.integration.test.ts`
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: existing backend test contents and current `tsx --test` backend scripts
- Produces: domain-based backend test layout and stable glob patterns for later support and runtime changes

- [ ] **Step 1: Write the failing test**

```ts
// backend/package.json should fail to discover moved tests until the
// test glob matches nested directories under tests/unit/** and tests/integration/**.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -w backend`
Expected: after moving one representative file into `backend/tests/unit/auth/`, discovery fails or misses that test under the old flat assumption

- [ ] **Step 3: Write minimal implementation**

```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration",
    "test:unit": "tsx --test \"tests/unit/**/*.test.ts\"",
    "test:integration": "tsx --test \"tests/integration/**/*.test.ts\"",
    "test:infrastructure": "tsx --test \"tests/infrastructure/**/*.test.ts\""
  }
}
```

```text
backend/tests/unit/auth/app-session-service.unit.test.ts
backend/tests/unit/config/app-session-config.unit.test.ts
backend/tests/integration/auth/cookie-session.integration.test.ts
backend/tests/integration/security/server-hardening.integration.test.ts
```

Use `git mv` for every file move so history stays attached.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -w backend`
Expected: PASS with the moved backend unit tests still discovered

Run: `npm run test:integration -w backend`
Expected: PASS with the moved backend integration tests still discovered

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/tests
git commit -m "test: organize backend tests by domain"
```

## Task 3: Reorganize Frontend Unit Tests Into Domain, Hooks, Utilities, And State

**Files:**
- Create: `frontend/tests/unit/domain/analysis/.gitkeep`
- Create: `frontend/tests/unit/domain/auth/.gitkeep`
- Create: `frontend/tests/unit/domain/image-quality/.gitkeep`
- Create: `frontend/tests/unit/domain/inspections/.gitkeep`
- Create: `frontend/tests/unit/hooks/.gitkeep`
- Create: `frontend/tests/unit/state/.gitkeep`
- Create: `frontend/tests/unit/utilities/.gitkeep`
- Move: `frontend/tests/unit/admin-range-report-adapter.test.ts` -> `frontend/tests/unit/domain/analysis/admin-range-report-adapter.unit.test.ts`
- Move: `frontend/tests/unit/admin-report-pdf-export.test.ts` -> `frontend/tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts`
- Move: `frontend/tests/unit/admin-report-protocol.test.ts` -> `frontend/tests/unit/domain/analysis/admin-report-protocol.unit.test.ts`
- Move: `frontend/tests/unit/history-report-pdf-export.test.ts` -> `frontend/tests/unit/domain/analysis/history-report-pdf-export.unit.test.ts`
- Move: `frontend/tests/unit/inspector-daily-report-adapter.test.ts` -> `frontend/tests/unit/domain/analysis/inspector-daily-report-adapter.unit.test.ts`
- Move: `frontend/tests/unit/report-letterhead-assets.test.ts` -> `frontend/tests/unit/domain/analysis/report-letterhead-assets.unit.test.ts`
- Move: `frontend/tests/unit/report-letterheads.test.ts` -> `frontend/tests/unit/domain/analysis/report-letterheads.unit.test.ts`
- Move: `frontend/tests/unit/report-pdf-doc-definition.test.ts` -> `frontend/tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts`
- Move: `frontend/tests/unit/report-pdf-runtime.test.ts` -> `frontend/tests/unit/domain/analysis/report-pdf-runtime.unit.test.ts`
- Move: `frontend/tests/unit/report-template-selection.test.ts` -> `frontend/tests/unit/domain/analysis/report-template-selection.unit.test.ts`
- Move: `frontend/tests/unit/local-passkey-auth.test.ts` -> `frontend/tests/unit/domain/auth/local-passkey-auth.unit.test.ts`
- Move: `frontend/tests/unit/security-auth-clients.test.tsx` -> `frontend/tests/unit/domain/auth/security-auth-clients.unit.test.tsx`
- Move: `frontend/tests/unit/auth-context-offline.test.tsx` -> `frontend/tests/unit/state/auth-context-offline.unit.test.tsx`
- Move: `frontend/tests/unit/offline-auth-envelope.test.ts` -> `frontend/tests/unit/state/offline-auth-envelope.unit.test.ts`
- Move: `frontend/tests/unit/developer-role-auth.test.tsx` -> `frontend/tests/unit/state/developer-role-auth.unit.test.tsx`
- Move: `frontend/tests/unit/developer-dashboard-role-gating.test.tsx` -> `frontend/tests/unit/state/developer-dashboard-role-gating.unit.test.tsx`
- Move: `frontend/tests/unit/developer-dashboard-workspace.test.tsx` -> `frontend/tests/unit/state/developer-dashboard-workspace.unit.test.tsx`
- Move: `frontend/tests/unit/developer-dashboard-export-timeout.test.ts` -> `frontend/tests/unit/utilities/developer-dashboard-export-timeout.unit.test.ts`
- Move: `frontend/tests/unit/api-request-timeouts.test.ts` -> `frontend/tests/unit/utilities/api-request-timeouts.unit.test.ts`
- Move: `frontend/tests/unit/camera-controls.test.ts` -> `frontend/tests/unit/utilities/camera-controls.unit.test.ts`
- Move: `frontend/tests/unit/camera-facade-layout.test.ts` -> `frontend/tests/unit/utilities/camera-facade-layout.unit.test.ts`
- Move: `frontend/tests/unit/camera-quality.test.ts` -> `frontend/tests/unit/domain/image-quality/camera-quality.unit.test.ts`
- Move: `frontend/tests/unit/inspection-location.test.ts` -> `frontend/tests/unit/domain/inspections/inspection-location.unit.test.ts`
- Move: `frontend/tests/unit/inspection-pre-scan.test.ts` -> `frontend/tests/unit/domain/inspections/inspection-pre-scan.unit.test.ts`
- Move: `frontend/tests/unit/messages-view-state.test.ts` -> `frontend/tests/unit/state/messages-view-state.unit.test.ts`
- Move: `frontend/tests/unit/password-input-toggle.test.tsx` -> `frontend/tests/unit/hooks/password-input-toggle.unit.test.tsx`
- Move: `frontend/tests/unit/use-desktop.test.tsx` -> `frontend/tests/unit/hooks/use-desktop.unit.test.tsx`
- Move: `frontend/tests/unit/admin-dashboard-summary.test.tsx` -> `frontend/tests/unit/hooks/admin-dashboard-summary.unit.test.tsx`
- Move: `frontend/tests/unit/camera-view.test.tsx` -> `frontend/tests/unit/hooks/camera-view.unit.test.tsx`
- Modify: `frontend/package.json`

**Interfaces:**
- Consumes: current frontend unit tests and the root/frontend `test:unit` scripts
- Produces: nested frontend unit domains that later tasks can complement with component and integration tests

- [ ] **Step 1: Write the failing test**

```ts
// frontend/package.json should continue to use recursive globs after the
// unit tests move into nested directories.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -w frontend`
Expected: after moving a representative file into `frontend/tests/unit/domain/`, discovery fails or misses it until the glob is confirmed

- [ ] **Step 3: Write minimal implementation**

```json
{
  "scripts": {
    "test:unit": "tsx --test \"tests/unit/**/*.test.ts\" \"tests/unit/**/*.test.tsx\"",
    "test:component": "tsx --test \"tests/component/**/*.test.ts\" \"tests/component/**/*.test.tsx\"",
    "test:integration": "tsx --test \"tests/integration/**/*.test.ts\" \"tests/integration/**/*.test.tsx\""
  }
}
```

```text
frontend/tests/unit/domain/auth/security-auth-clients.unit.test.tsx
frontend/tests/unit/domain/inspections/inspection-pre-scan.unit.test.ts
frontend/tests/unit/state/auth-context-offline.unit.test.tsx
frontend/tests/unit/hooks/use-desktop.unit.test.tsx
frontend/tests/unit/utilities/api-request-timeouts.unit.test.ts
```

Use `git mv` for the file moves and update relative imports only where a test file references source files via relative path assumptions.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -w frontend`
Expected: PASS with the moved frontend unit tests still discovered

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/tests/unit
git commit -m "test: split frontend unit tests by responsibility"
```

## Task 4: Create Frontend Component And Integration Layers By Moving Misplaced Low-Level Tests Out Of Playwright

**Files:**
- Create: `frontend/tests/component/analysis/analysis-result-card.component.test.tsx`
- Create: `frontend/tests/component/inspections/inspection-list-item.component.test.tsx`
- Create: `frontend/tests/component/shared/terms-and-conditions.component.test.tsx`
- Create: `frontend/tests/integration/api/inspection-client.integration.test.ts`
- Create: `frontend/tests/integration/api/user-chat-client.integration.test.ts`
- Create: `frontend/tests/integration/camera/camera-quality.integration.test.ts`
- Create: `frontend/tests/integration/offline/use-inspections.integration.test.ts`
- Create: `frontend/tests/integration/offline/offline-analysis-explanation.integration.test.ts`
- Create: `frontend/tests/integration/storage/backend-cors.integration.test.ts`
- Delete or retire after move: `frontend/tests/e2e/analysis-result-card.spec.ts`
- Delete or retire after move: `frontend/tests/e2e/inspection-list-item.spec.ts`
- Delete or retire after move: `frontend/tests/e2e/inspection-client.spec.ts`
- Delete or retire after move: `frontend/tests/e2e/use-inspections.spec.ts`
- Delete or retire after move: `frontend/tests/e2e/user-chat-client.spec.ts`
- Delete or retire after move: `frontend/tests/e2e/backend-cors.spec.ts`
- Delete or retire after move: `frontend/tests/e2e/camera-quality-integration.spec.ts`
- Delete or retire after move: `frontend/tests/e2e/offline-analysis-explanation.spec.ts`
- Modify: `frontend/package.json`

**Interfaces:**
- Consumes: existing low-level Playwright assertions and the new frontend component/integration script slots
- Produces: lightweight component/integration suites that reduce E2E breadth before journey regrouping

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import AnalysisResultCard from "../../../src/components/AnalysisResultCard";

test("renders the freshness summary without launching Playwright", () => {
  render(<AnalysisResultCard result={{ freshness: "fresh", confidence: 0.91 }} />);
  expect(screen.getByText(/fresh/i)).toBeTruthy();
});
```

```ts
import { InspectionClient } from "../../../src/integrations/api/InspectionClient";

test("InspectionClient reuses the shared fetch wrapper without a browser", async () => {
  const client = new InspectionClient();
  expect(typeof client.getInspections).toBe("function");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:component -w frontend`
Expected: FAIL because the component test file and script do not exist yet

Run: `npm run test:integration -w frontend`
Expected: FAIL because the integration test file and script do not exist yet

- [ ] **Step 3: Write minimal implementation**

```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:component && npm run test:integration && npm run test:e2e",
    "test:component": "tsx --test \"tests/component/**/*.test.ts\" \"tests/component/**/*.test.tsx\"",
    "test:integration": "tsx --test \"tests/integration/**/*.test.ts\" \"tests/integration/**/*.test.tsx\""
  }
}
```

```tsx
// frontend/tests/component/analysis/analysis-result-card.component.test.tsx
import { render, screen } from "@testing-library/react";
import AnalysisResultCard from "../../../src/components/AnalysisResultCard";

test("renders a freshness label and confidence value", () => {
  render(
    <AnalysisResultCard
      result={{
        freshness: "fresh",
        confidence: 0.91,
        probabilities: { fresh: 0.91, not_fresh: 0.06, spoiled: 0.03 },
      } as never}
    />,
  );

  expect(screen.getByText(/fresh/i)).toBeTruthy();
  expect(screen.getByText(/91/i)).toBeTruthy();
});
```

```ts
// frontend/tests/integration/api/inspection-client.integration.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { InspectionClient } from "../../../src/integrations/api/InspectionClient";

test("InspectionClient exposes the inspection query methods without Playwright", () => {
  const client = new InspectionClient();
  assert.equal(typeof client.getInspections, "function");
});
```

Port each misplaced Playwright file into the lightest valid layer, preserving its assertions as closely as the lighter harness allows.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:component -w frontend`
Expected: PASS

Run: `npm run test:integration -w frontend`
Expected: PASS

Run: `npm run test:unit -w frontend`
Expected: PASS with the newly added lower-layer suites not breaking existing unit discovery

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/tests/component frontend/tests/integration frontend/tests/e2e
git commit -m "test: move low-level browser checks into lighter frontend layers"
```

## Task 5: Reorganize Playwright Into Journeys, Security, Offline, Smoke, And Shared Support

**Files:**
- Create: `frontend/tests/e2e/journeys/inspector/`
- Create: `frontend/tests/e2e/journeys/administrator/`
- Create: `frontend/tests/e2e/journeys/developer/`
- Create: `frontend/tests/e2e/offline/`
- Create: `frontend/tests/e2e/security/`
- Create: `frontend/tests/e2e/smoke/`
- Create: `frontend/tests/support/api/playwright-api.ts`
- Create: `frontend/tests/support/auth/session.ts`
- Create: `frontend/tests/support/page-objects/LoginPage.ts`
- Create: `frontend/tests/support/page-objects/InspectorDashboardPage.ts`
- Move: `frontend/tests/e2e/support/app.ts` -> `frontend/tests/support/fixtures/app.ts`
- Move: `frontend/tests/e2e/support/image.ts` -> `frontend/tests/support/factories/image.ts`
- Move: `frontend/tests/e2e/passkey-auth.spec.ts` -> `frontend/tests/e2e/journeys/inspector/passkey-auth.e2e.spec.ts`
- Move: `frontend/tests/e2e/inspect-page.spec.ts` -> `frontend/tests/e2e/journeys/inspector/capture-and-analyze.e2e.spec.ts`
- Move: `frontend/tests/e2e/offline-analysis.spec.ts` -> `frontend/tests/e2e/offline/offline-analysis.e2e.spec.ts`
- Move: `frontend/tests/e2e/offline-passkey-unlock.spec.ts` -> `frontend/tests/e2e/offline/offline-passkey-unlock.e2e.spec.ts`
- Move: `frontend/tests/e2e/admin-dashboard.spec.ts` -> `frontend/tests/e2e/journeys/administrator/admin-dashboard.e2e.spec.ts`
- Move: `frontend/tests/e2e/developer-options.spec.ts` -> `frontend/tests/e2e/journeys/developer/developer-options.e2e.spec.ts`
- Move: `frontend/tests/e2e/not-found.spec.ts` -> `frontend/tests/e2e/smoke/not-found.e2e.spec.ts`
- Move: `frontend/tests/e2e/example.spec.ts` -> `frontend/tests/e2e/smoke/example.e2e.spec.ts`
- Modify: `frontend/playwright.config.ts`
- Modify: `frontend/package.json`

**Interfaces:**
- Consumes: remaining Playwright-worthy tests and the current config rooted at `frontend/tests/e2e`
- Produces: journey-first E2E layout and reusable support modules under `frontend/tests/support`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/playwright.config.ts should continue to discover specs after
// they move into nested journey/security/offline/smoke folders.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e -w frontend -- --list`
Expected: after moving one spec into `frontend/tests/e2e/journeys/inspector/`, the old assumptions about flat layout or support imports surface as failures

- [ ] **Step 3: Write minimal implementation**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
    serviceWorkers: "block",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
  },
});
```

```ts
// frontend/tests/support/page-objects/LoginPage.ts
import type { Page } from "@playwright/test";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto("/login");
  }

  async submit(email: string, password: string): Promise<void> {
    await this.page.getByLabel(/email/i).fill(email);
    await this.page.getByLabel(/password/i).fill(password);
    await this.page.getByRole("button", { name: /sign in/i }).click();
  }
}
```

Add `test:e2e:critical` in `frontend/package.json` to target a small smoke/journey subset such as:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:critical": "playwright test tests/e2e/journeys/inspector tests/e2e/journeys/administrator tests/e2e/offline/offline-analysis.e2e.spec.ts tests/e2e/security"
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:e2e -w frontend -- --list`
Expected: Playwright lists the nested `*.e2e.spec.ts` files successfully

Run: `npm run test:e2e:critical -w frontend -- --list`
Expected: only the critical subset is listed

- [ ] **Step 5: Commit**

```bash
git add frontend/playwright.config.ts frontend/package.json frontend/tests/e2e frontend/tests/support
git commit -m "test: regroup playwright into journeys and shared support"
```

## Task 6: Extract A Test-Safe Backend App Factory And Keep Server Startup Production-Only

**Files:**
- Create: `backend/src/app.ts`
- Modify: `backend/src/server.ts`
- Modify: `backend/tests/integration/auth/cookie-session.integration.test.ts`
- Modify: `backend/tests/integration/admin/status-propagation.integration.test.ts`
- Modify: `backend/tests/integration/developer/dashboard-auth.integration.test.ts`
- Modify: `backend/tests/integration/security/error-middleware.integration.test.ts`
- Modify: `backend/tests/integration/security/server-hardening.integration.test.ts`

**Interfaces:**
- Consumes: current route wiring in `backend/src/server.ts`
- Produces: `createApp()` for in-memory integration tests and `startServer()` for production startup

- [ ] **Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../../src/app";

test("createApp returns an Express app without listening on a port", () => {
  const app = createApp();
  assert.equal(typeof app.use, "function");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:integration -w backend`
Expected: FAIL because `backend/src/app.ts` and `createApp()` do not exist yet

- [ ] **Step 3: Write minimal implementation**

```ts
// backend/src/app.ts
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import fs from "fs";
import { Config } from "./config";
import { createCorsOptions, isOriginAllowed } from "./config/cors";
import { globalErrorHandler } from "./middleware/errorHandler";
import { applySecurityHeaders } from "./middleware/securityHeaders";
import analysisRoutes from "./routes/analysis";
import profileRoutes from "./routes/profiles";
import inspectionRoutes from "./routes/inspections";
import accessCodeRoutes from "./routes/accessCodes";
import statsRoutes from "./routes/stats";
import uploadRoutes from "./routes/upload";
import authRoutes from "./routes/auth";
import chatRoutes from "./routes/chat";
import marketLocationRoutes from "./routes/marketLocations";
import auditLogRoutes from "./routes/auditLogs";
import developerOptionsRoutes from "./routes/developerOptions";
import developerDashboardRoutes from "./routes/developerDashboard";
import userChatRoutes from "./routes/userChat";

function isSafeMethod(method: string): boolean {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

function rejectDisallowedOrigins(req: Request, res: Response, next: NextFunction): void {
  const config = Config.getInstance();
  if (isSafeMethod(req.method) || isOriginAllowed(req.header("origin"), config.allowedOrigins)) {
    next();
    return;
  }

  res.status(403).json({ error: "Origin not allowed" });
}

export function createApp() {
  const config = Config.getInstance();
  if (!fs.existsSync(config.uploadDir)) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
  }

  const app = express();
  app.use(applySecurityHeaders);
  app.use(rejectDisallowedOrigins);
  app.use(cors(createCorsOptions(config.allowedOrigins)));
  app.use(express.json());
  app.use("/api/analysis", analysisRoutes);
  app.use("/api/profiles", profileRoutes);
  app.use("/api/inspections", inspectionRoutes);
  app.use("/api/access-codes", accessCodeRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/market-locations", marketLocationRoutes);
  app.use("/api/audit-logs", auditLogRoutes);
  app.use("/api/developer-options", developerOptionsRoutes);
  app.use("/api/developer-dashboard", developerDashboardRoutes);
  app.use("/api/user-chat", userChatRoutes);
  app.use(globalErrorHandler);
  return app;
}
```

```ts
// backend/src/server.ts
import type { Server } from "http";
import { createApp } from "./app";
import { Config } from "./config";

const config = Config.getInstance();
const app = createApp();

export function startServer(): Server {
  const server = app.listen(config.port, () => {
    console.log(`MeatLens backend running on port ${config.port}`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}
```

Update the backend integration tests to import `createApp()` or helpers built on it instead of importing a pre-listening default app module.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:integration -w backend`
Expected: PASS with integration tests using the in-memory app entry

Run: `npm run test:unit -w backend`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/app.ts backend/src/server.ts backend/tests/integration
git commit -m "refactor: extract backend app factory for tests"
```

## Task 7: Add Backend Test Support, Deterministic Fixtures, And Infrastructure Suite Entry Points

**Files:**
- Create: `backend/tests/setup/env.ts`
- Create: `backend/tests/setup/lifecycle.ts`
- Create: `backend/tests/support/appFactory.ts`
- Create: `backend/tests/support/authFactory.ts`
- Create: `backend/tests/support/requestFactory.ts`
- Create: `backend/tests/support/fixtures.ts`
- Create: `backend/tests/support/modelFake.ts`
- Create: `backend/tests/support/supabaseFake.ts`
- Create: `backend/tests/infrastructure/model-runtime/model-output.contract.test.ts`
- Create: `backend/tests/infrastructure/supabase/.gitkeep`
- Create: `backend/tests/infrastructure/storage/.gitkeep`
- Create: `backend/tests/infrastructure/email/.gitkeep`
- Modify: `backend/package.json`
- Modify: representative backend integration tests to consume shared support helpers

**Interfaces:**
- Consumes: `createApp()` from Task 6 and existing auth/session/model behavior
- Produces: reusable backend test support modules, deterministic factories, and infrastructure suite entry points

- [ ] **Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { predictionFactory } from "../support/fixtures";

test("predictionFactory returns deterministic model metadata", () => {
  const prediction = predictionFactory();
  assert.equal(prediction.modelVersion, "test-model-v1");
});
```

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { assertValidFreshnessPrediction } from "./model-output.contract.test";

test("invalid probabilities fail safely", () => {
  assert.throws(() =>
    assertValidFreshnessPrediction({
      label: "fresh",
      confidence: 0.9,
      probabilities: { fresh: 0.9, not_fresh: 0.2, spoiled: 0.1 },
      modelVersion: "bad",
      inferenceTimeMs: 12,
    }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:infrastructure -w backend`
Expected: FAIL because the infrastructure test script or files do not exist yet

- [ ] **Step 3: Write minimal implementation**

```ts
// backend/tests/support/fixtures.ts
export interface FreshnessPredictionFixture {
  label: "fresh" | "not_fresh" | "spoiled";
  confidence: number;
  probabilities: {
    fresh: number;
    not_fresh: number;
    spoiled: number;
  };
  modelVersion: string;
  inferenceTimeMs: number;
}

export function predictionFactory(
  overrides: Partial<FreshnessPredictionFixture> = {},
): FreshnessPredictionFixture {
  return {
    label: "fresh",
    confidence: 0.91,
    probabilities: {
      fresh: 0.91,
      not_fresh: 0.06,
      spoiled: 0.03,
    },
    modelVersion: "test-model-v1",
    inferenceTimeMs: 12,
    ...overrides,
  };
}
```

```ts
// backend/tests/infrastructure/model-runtime/model-output.contract.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { predictionFactory } from "../../support/fixtures";

export function assertValidFreshnessPrediction(result: ReturnType<typeof predictionFactory>): void {
  const total = Object.values(result.probabilities).reduce((sum, value) => sum + value, 0);
  assert.equal(Object.keys(result.probabilities).length, 3);
  assert.equal(Number.isFinite(result.confidence), true);
  assert.equal(result.confidence >= 0 && result.confidence <= 1, true);
  assert.equal(Math.abs(total - 1) < 0.001, true);
}

test("valid prediction fixtures satisfy the model output contract", () => {
  assertValidFreshnessPrediction(predictionFactory());
});

test("invalid probabilities fail safely", () => {
  assert.throws(() =>
    assertValidFreshnessPrediction(
      predictionFactory({
        probabilities: { fresh: 0.9, not_fresh: 0.2, spoiled: 0.1 },
      }),
    ),
  );
});
```

```json
{
  "scripts": {
    "test:infrastructure": "tsx --test \"tests/infrastructure/**/*.test.ts\""
  }
}
```

Add helpers in `appFactory.ts`, `authFactory.ts`, and `requestFactory.ts` only for setup that appears at least twice in backend integration tests.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:infrastructure -w backend`
Expected: PASS

Run: `npm run test:integration -w backend`
Expected: PASS with shared support imports

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/tests/setup backend/tests/support backend/tests/infrastructure
git commit -m "test: add backend support modules and infrastructure suite"
```

## Task 8: Add Root Contract Tests And Shared Schema Validators

**Files:**
- Create: `tests/contracts/schemas/analysis-response.schema.ts`
- Create: `tests/contracts/schemas/error-response.schema.ts`
- Create: `tests/contracts/schemas/inspection.schema.ts`
- Create: `tests/contracts/api-contract.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: stable backend/frontend shared response shapes and deterministic fixtures from prior tasks
- Produces: root contract suite runnable outside frontend/backend unit boundaries

- [ ] **Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { validateAnalysisResponse } from "./schemas/analysis-response.schema";

test("analysis response contract accepts the known good shape", () => {
  assert.equal(
    validateAnalysisResponse({
      freshness: "fresh",
      confidence: 0.91,
      probabilities: { fresh: 0.91, not_fresh: 0.06, spoiled: 0.03 },
      modelVersion: "test-model-v1",
      inferenceTimeMs: 12,
    }),
    true,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:contract`
Expected: FAIL because the root contract script and schema files do not exist yet

- [ ] **Step 3: Write minimal implementation**

```ts
// tests/contracts/schemas/analysis-response.schema.ts
export interface AnalysisResponseContract {
  freshness: "fresh" | "not_fresh" | "spoiled";
  confidence: number;
  probabilities: {
    fresh: number;
    not_fresh: number;
    spoiled: number;
  };
  modelVersion: string;
  inferenceTimeMs: number;
}

export function validateAnalysisResponse(value: unknown): value is AnalysisResponseContract {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Record<string, unknown>;
  const probabilities = result.probabilities as Record<string, unknown> | undefined;
  return (
    (result.freshness === "fresh" || result.freshness === "not_fresh" || result.freshness === "spoiled") &&
    typeof result.confidence === "number" &&
    typeof result.modelVersion === "string" &&
    typeof result.inferenceTimeMs === "number" &&
    !!probabilities &&
    typeof probabilities.fresh === "number" &&
    typeof probabilities.not_fresh === "number" &&
    typeof probabilities.spoiled === "number"
  );
}
```

```ts
// tests/contracts/api-contract.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { validateAnalysisResponse } from "./schemas/analysis-response.schema";

test("analysis response contract accepts the expected application payload", () => {
  assert.equal(
    validateAnalysisResponse({
      freshness: "fresh",
      confidence: 0.91,
      probabilities: { fresh: 0.91, not_fresh: 0.06, spoiled: 0.03 },
      modelVersion: "test-model-v1",
      inferenceTimeMs: 12,
    }),
    true,
  );
});
```

```json
{
  "scripts": {
    "test:contract": "tsx --test \"tests/contracts/**/*.test.ts\""
  }
}
```

Add `inspection.schema.ts` and `error-response.schema.ts` in the same style during this task instead of leaving a half-finished contract layer.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:contract`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json tests/contracts
git commit -m "test: add root API contract suite"
```

## Task 9: Split Local Scripts And Add CI Lanes For Fast, Critical, And Slower Suites

**Files:**
- Modify: `package.json`
- Modify: `frontend/package.json`
- Modify: `backend/package.json`
- Create: `.github/workflows/test-architecture.yml`

**Interfaces:**
- Consumes: the unit/component/integration/infrastructure/contract/e2e scripts created in earlier tasks
- Produces: root `test:fast`, `test:ci`, and GitHub Actions jobs that mirror the new architecture

- [ ] **Step 1: Write the failing test**

```yaml
# The failure condition for this task is missing workflow/jobs:
# GitHub Actions should not yet provide separate backend-unit,
# frontend-unit, backend-integration, contract-tests, and e2e-critical jobs.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `Get-Content .github/workflows/test-architecture.yml`
Expected: file does not exist yet

Run: `npm run test:fast`
Expected: command is missing before this task

- [ ] **Step 3: Write minimal implementation**

```json
{
  "scripts": {
    "test:fast": "npm run test:unit -w frontend && npm run test:component -w frontend && npm run test:integration -w frontend && npm run test:unit -w backend",
    "test:backend:integration": "npm run test:integration -w backend",
    "test:infrastructure": "npm run test:infrastructure -w backend",
    "test:contract": "tsx --test \"tests/contracts/**/*.test.ts\"",
    "test:e2e:critical": "npm run test:e2e:critical -w frontend",
    "test:e2e:full": "npm run test:e2e -w frontend",
    "test:ci": "npm run lint && npm run build && npm run test:fast && npm run test:backend:integration && npm run test:contract"
  }
}
```

```yaml
name: Test Architecture

on:
  pull_request:
  workflow_dispatch:
  schedule:
    - cron: "0 18 * * *"

jobs:
  lint-and-types:
    if: github.event_name != 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run build

  backend-unit:
    if: github.event_name != 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run test:unit -w backend

  frontend-unit:
    if: github.event_name != 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run test:unit -w frontend
      - run: npm run test:component -w frontend
      - run: npm run test:integration -w frontend

  backend-integration:
    if: github.event_name != 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run test:integration -w backend

  contract-tests:
    if: github.event_name != 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run test:contract

  e2e-critical:
    if: github.event_name != 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e:critical -w frontend

  nightly-full:
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e -w frontend
      - run: npm run test:infrastructure -w backend
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:fast`
Expected: PASS

Run: `npm run test:contract`
Expected: PASS

Run: `Get-Content .github/workflows/test-architecture.yml`
Expected: file exists with separate PR and nightly/manual lanes

- [ ] **Step 5: Commit**

```bash
git add package.json frontend/package.json backend/package.json .github/workflows/test-architecture.yml
git commit -m "ci: split test lanes by architecture"
```

## Task 10: Full Verification, Docs Touch-Up, And Migration Audit

**Files:**
- Modify: `documentation/ARCHITECTURE.md`
- Modify: `README.md`
- Modify: `frontend/README.md`
- Modify: `backend/README.md`
- Modify: `docs/superpowers/specs/2026-08-02-test-architecture-refactor-design.md` only if reality changed during implementation

**Interfaces:**
- Consumes: all prior tasks
- Produces: verified documentation and a final audit that the refactor meets the approved acceptance criteria

- [ ] **Step 1: Write the failing test**

```md
Documentation should fail this task if it still describes the old flat test folders or omits the new unit/component/integration/contract split.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rg "tests/unit|tests/e2e|test:ci|test:e2e:critical" README.md backend/README.md frontend/README.md documentation/ARCHITECTURE.md`
Expected: references are missing or still describe the pre-refactor structure

- [ ] **Step 3: Write minimal implementation**

```md
## Test Architecture

- `backend/tests/unit/*` stores isolated backend logic grouped by domain.
- `backend/tests/integration/*` stores in-memory Express flow tests.
- `backend/tests/infrastructure/*` stores slower runtime-boundary checks.
- `frontend/tests/unit/*` stores domain, hook, utility, and state tests.
- `frontend/tests/component/*` stores isolated UI rendering tests.
- `frontend/tests/integration/*` stores frontend boundary tests.
- `frontend/tests/e2e/*` stores user journeys, offline flows, security regressions, and smoke checks.
- `tests/contracts/*` stores shared application boundary contracts.

Fast local feedback:

```bash
npm run test:fast
```

Critical browser regression coverage:

```bash
npm run test:e2e:critical
```
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:fast`
Expected: PASS

Run: `npm run test:backend:integration`
Expected: PASS

Run: `npm run test:contract`
Expected: PASS

Run: `npm run test:infrastructure`
Expected: PASS

Run: `npm run test:e2e:critical`
Expected: PASS

Run: `git status --short`
Expected: clean working tree after the final commit

- [ ] **Step 5: Commit**

```bash
git add README.md frontend/README.md backend/README.md documentation/ARCHITECTURE.md
git commit -m "docs: document layered test architecture"
```

## Self-Review

### Spec coverage

- Root shared fixtures, contracts, and smoke directories are covered in Tasks 1 and 8.
- Backend domain-based reorganization is covered in Tasks 2, 6, and 7.
- Frontend unit/component/integration/E2E restructuring is covered in Tasks 3, 4, and 5.
- App factory extraction is covered in Task 6.
- Shared test support and deterministic fixtures are covered in Task 7.
- Contract testing is covered in Task 8.
- Script and CI separation is covered in Task 9.
- Documentation and final verification are covered in Task 10.

### Placeholder scan

- No placeholder markers or deferred implementation language remain in task steps.
- Every task includes exact commands, concrete file paths, and code snippets for the key changes.

### Type consistency

- Backend app factory consistently uses `createApp()`.
- Root contract validation consistently uses `validateAnalysisResponse`.
- Backend model output checks consistently use `predictionFactory` and `assertValidFreshnessPrediction`.
