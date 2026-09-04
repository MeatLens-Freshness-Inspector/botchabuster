# Fast Deterministic CI Test Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the blocking CI test gate deterministic and keep each test execution lane under 120 seconds without reducing coverage.

**Architecture:** Keep the existing GitHub workflow and quality-gate aggregation, but parallelize independent frontend suites and Playwright workers. Move live E2E dates into a UTC-based test factory, split the route contract into named tests, and add CI diagnostics so failures are visible and downloadable.

**Tech Stack:** GitHub Actions, Node.js 22, npm workspaces, TypeScript, `tsx --test`, Playwright 1.57, Chromium.

## Global Constraints

- Full Playwright remains a blocking check on every applicable push.
- Critical Playwright remains blocking.
- Every test execution lane must finish within 120 seconds.
- CI and browser date handling use UTC.
- No tests are skipped, weakened, or made advisory.
- Existing unrelated worktree changes remain unstaged and untouched.

---

### Task 1: Add a tested UTC future-date factory

**Files:**
- Create: `frontend/tests/support/factories/dates.ts`
- Create: `frontend/tests/unit/factories/date-factories.unit.test.ts`

**Interfaces:**
- Produces `formatUtcDateOnly(date: Date): string` for `YYYY-MM-DD` formatting.
- Produces `futureDateOnly(daysFromNow?: number, now?: Date): string` for a valid live date relative to a supplied or current UTC date.
- Later E2E tasks consume `futureDateOnly()` without importing application code.

- [ ] **Step 1: Write the failing tests**

Create `frontend/tests/unit/factories/date-factories.unit.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { formatUtcDateOnly, futureDateOnly } from "../../support/factories/dates";

test("formatUtcDateOnly formats the UTC calendar date", () => {
  assert.equal(formatUtcDateOnly(new Date("2026-09-04T23:59:59.000Z")), "2026-09-04");
});

test("futureDateOnly crosses month and year boundaries from UTC", () => {
  assert.equal(futureDateOnly(30, new Date("2026-12-15T23:59:59.000Z")), "2027-01-14");
});

test("futureDateOnly handles leap-year arithmetic", () => {
  assert.equal(futureDateOnly(1, new Date("2028-02-28T12:00:00.000Z")), "2028-02-29");
});

test("futureDateOnly defaults to a date after the current UTC date", () => {
  const today = new Date();
  const future = futureDateOnly();

  assert.ok(future > formatUtcDateOnly(today));
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run from the repository root:

```powershell
npx tsx --test frontend/tests/unit/factories/date-factories.unit.test.ts
```

Expected: FAIL because `frontend/tests/support/factories/dates.ts` does not exist yet.

- [ ] **Step 3: Implement the minimal date factory**

Create `frontend/tests/support/factories/dates.ts`:

```ts
export function formatUtcDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

export function futureDateOnly(daysFromNow = 30, now = new Date()): string {
  const future = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromNow),
  );

  return formatUtcDateOnly(future);
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

```powershell
npx tsx --test frontend/tests/unit/factories/date-factories.unit.test.ts
```

Expected: 4 tests pass and 0 fail.

- [ ] **Step 5: Commit the self-contained factory**

```powershell
git add -- frontend/tests/support/factories/dates.ts frontend/tests/unit/factories/date-factories.unit.test.ts
git commit -m "test: add deterministic UTC future date factory"
```

### Task 2: Replace calendar-sensitive live E2E dates

**Files:**
- Modify: `frontend/tests/e2e/journeys/inspector/camera-capture.e2e.spec.ts`
- Modify: `frontend/tests/e2e/journeys/inspector/camera-quality.e2e.spec.ts`
- Modify: `frontend/tests/e2e/journeys/inspector/inspect-page.e2e.spec.ts`
- Modify: `frontend/tests/e2e/offline/offline-analysis.e2e.spec.ts`

**Interfaces:**
- Consumes `futureDateOnly()` from Task 1.
- Existing user-owned developer fixture changes in `frontend/tests/support/fixtures/app.ts` remain intact; this task validates that developer-only journeys use the explicit role already present in the working tree.

- [ ] **Step 1: Add the date factory import and replace helper dates**

Add this import to the three inspector files:

```ts
import { futureDateOnly } from "../../../support/factories/dates";
```

Add this import to the offline file:

```ts
import { futureDateOnly } from "../../support/factories/dates";
```

Replace every live checklist assignment with:

```ts
await page.getByLabel(/meat expiry date|expiry of meat/i).fill(futureDateOnly());
```

This removes the historical literal `2026-07-10` from the shared checklist helpers.

- [ ] **Step 2: Tie payload assertions to the date entered by each test**

In the inspect-page test that manually creates a pre-scan payload, define and reuse the value:

```ts
const meatExpiryDate = futureDateOnly();
await page.getByLabel(/meat expiry date|expiry of meat/i).fill(meatExpiryDate);
```

Change that payload expectation to:

```ts
meat_expiry_date: meatExpiryDate,
```

In the offline protocol-failure test, use the same local `meatExpiryDate` and change the queued-scan expectation to:

```ts
meatExpiryDate: meatExpiryDate,
```

Fixed dates in historical-data, formatting, and boundary assertions remain unchanged.

- [ ] **Step 3: Prove no live E2E literal remains**

```powershell
rg -n "2026-07-10" frontend/tests/e2e
```

Expected: no matches.

- [ ] **Step 4: Run the affected E2E files**

```powershell
$env:CI = "1"
npx playwright test frontend/tests/e2e/journeys/inspector/camera-capture.e2e.spec.ts frontend/tests/e2e/journeys/inspector/camera-quality.e2e.spec.ts frontend/tests/e2e/journeys/inspector/inspect-page.e2e.spec.ts frontend/tests/e2e/offline/offline-analysis.e2e.spec.ts --config=frontend/playwright.config.ts --workers=4 --reporter=line
Remove-Item Env:CI
```

Expected: all affected tests pass and the command stays below 120 seconds.

- [ ] **Step 5: Commit the date migration**

```powershell
git add -- frontend/tests/e2e/journeys/inspector/camera-capture.e2e.spec.ts frontend/tests/e2e/journeys/inspector/camera-quality.e2e.spec.ts frontend/tests/e2e/journeys/inspector/inspect-page.e2e.spec.ts frontend/tests/e2e/offline/offline-analysis.e2e.spec.ts
git commit -m "test: remove calendar-sensitive E2E dates"
```

### Task 3: Make Playwright execution parallel and diagnosable

**Files:**
- Modify: `frontend/playwright.config.ts`
- Modify: `frontend/tests/e2e/smoke/legacy-route-contract.e2e.spec.ts`

**Interfaces:**
- Playwright consumes `CI`, `TZ`, and the existing npm scripts.
- The route contract keeps using `ROUTE_CONTRACT_PATHS` from `frontend/src/app/router/paths.ts`.

- [ ] **Step 1: Replace the serial configuration**

Replace `frontend/playwright.config.ts` with:

```ts
import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.spec.ts",
fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 4 : 1,
  globalTimeout: isCI ? 110_000 : undefined,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "html",
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
    serviceWorkers: "block",
    timezoneId: "UTC",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !isCI,
  },
});
```

The 110-second Playwright global budget leaves a margin below the requested 120-second test limit.

- [ ] **Step 2: Split the route contract into named tests**

Replace `frontend/tests/e2e/smoke/legacy-route-contract.e2e.spec.ts` with:

```ts
import { expect, test } from "@playwright/test";
import { ROUTE_CONTRACT_PATHS } from "../../../src/app/router/paths";

const publicRoutePaths = new Set(["/", "/login", "/signup", "/forgot-password", "/reset-password"]);

for (const routePath of ROUTE_CONTRACT_PATHS) {
  test("route contract resolves " + routePath, async ({ page }) => {
    await page.goto(routePath);
    await expect(page.locator("#root")).not.toBeEmpty();
    await expect(page.getByText("The page you requested does not exist", { exact: false })).toHaveCount(0);

    if (publicRoutePaths.has(routePath)) {
      const expectedPath = routePath === "/" ? "\\/": routePath.replaceAll("/", "\\/");
      await expect(page).toHaveURL(new RegExp(expectedPath + "(?:$|\\?)"));
      return;
    }

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  });
}
```

This removes the file-level 90-second timeout and gives every route a distinct failure name while retaining all 14 route paths.

- [ ] **Step 3: Run the route contract with CI settings**

```powershell
$env:CI = "1"
npx playwright test frontend/tests/e2e/smoke/legacy-route-contract.e2e.spec.ts --config=frontend/playwright.config.ts --workers=4 --reporter=line
Remove-Item Env:CI
```

Expected: 14 named route tests pass with no test timeout.

- [ ] **Step 4: Run the full Playwright suite in three shards**

```powershell
$env:CI = "1"
npx.cmd playwright test --config=frontend/playwright.config.ts --workers=4 --shard=1/3 --reporter=line
npx.cmd playwright test --config=frontend/playwright.config.ts --workers=4 --shard=2/3 --reporter=line
npx.cmd playwright test --config=frontend/playwright.config.ts --workers=4 --shard=3/3 --reporter=line
Remove-Item Env:CI
```

Expected: all full-suite tests pass across three shards, with each shard staying within 120 seconds. If parallel-state failure appears, isolate the leaking fixture or storage key before changing worker count.

- [ ] **Step 5: Commit the Playwright changes**

```powershell
git add -- frontend/playwright.config.ts frontend/tests/e2e/smoke/legacy-route-contract.e2e.spec.ts
git commit -m "test: parallelize and diagnose Playwright routes"
```

### Task 4: Parallelize frontend validation and bound CI diagnostics

**Files:**
- Create: `frontend/scripts/run-unit-tests-ci.mjs`
- Modify: `frontend/package.json`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- The matrix job keeps the id `frontend-tests`, so `needs.frontend-tests.result` continues to feed the quality gate.
- Playwright jobs continue to run `npm run test:e2e:critical` and `npm run test:e2e:full`.
- Artifact paths are `frontend/playwright-report` and `frontend/test-results`.

- [ ] **Step 1: Add deterministic unit-test file sharding**

Add a `test:unit:ci` script that discovers every `tests/unit/**/*.test.ts` and `tests/unit/**/*.test.tsx` file, sorts the paths, estimates each file's cost from its test count/source size/component overhead plus measured slow-file overrides, and greedily assigns expensive files to the lightest requested `--shard=N/4` bucket. The runner must execute the selected files in one serial Node test process. Keep the existing local `test:unit` script unchanged.

```json
"test:unit": "tsx --test \"tests/unit/**/*.test.ts\" \"tests/unit/**/*.test.tsx\"",
"test:unit:ci": "node scripts/run-unit-tests-ci.mjs"
```

In the measured repository state, four weighted shards each pass in under 27 seconds. Automatic file discovery keeps newly added unit files inside the CI gate, and weighted assignment prevents a newly enlarged file from being placed by filename alone.

- [ ] **Step 2: Replace the frontend test job with a matrix**

Replace the existing `frontend-tests` job with:

```yaml
  frontend-tests:
    name: Frontend Unit, Component, and Integration Tests (${{ matrix.suite }})
    runs-on: ubuntu-latest
    needs: changes
    if: needs.changes.outputs.docs_only != 'true' && needs.changes.outputs.frontend == 'true'
    strategy:
      fail-fast: false
      matrix:
        include:
          - suite: unit shard 1/4
            command: timeout 110s npm run test:unit:ci -w frontend -- --shard=1/4
          - suite: unit shard 2/4
            command: timeout 110s npm run test:unit:ci -w frontend -- --shard=2/4
          - suite: unit shard 3/4
            command: timeout 110s npm run test:unit:ci -w frontend -- --shard=3/4
          - suite: unit shard 4/4
            command: timeout 110s npm run test:unit:ci -w frontend -- --shard=4/4
          - suite: component
            command: timeout 110s npm run test:component -w frontend
          - suite: integration
            command: timeout 110s npm run test:integration -w frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Run ${{ matrix.suite }}
        run: ${{ matrix.command }}
```

Any failed matrix copy makes the aggregated `frontend-tests` result fail.

- [ ] **Step 3: Pin CI dates and bound E2E jobs**

Add this top-level environment after the existing workflow `concurrency` block:

```yaml
env:
  TZ: UTC
```

Add `timeout-minutes: 8` under `runs-on` for both `e2e-critical` and `full-playwright`. Keep their existing install and browser-cache steps. Replace each final test step with a named run step and append the corresponding failure artifact step:

```yaml
      - name: Run critical Playwright tests
        run: npm run test:e2e:critical
      - name: Upload critical Playwright diagnostics
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-critical-${{ github.run_id }}
          path: |
            frontend/playwright-report
            frontend/test-results
          if-no-files-found: ignore
          retention-days: 7
```

```yaml
      - name: Run full Playwright tests
        run: npm run test:e2e:full -- --shard=${{ matrix.shard }}/3
      - name: Upload full Playwright diagnostics
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-full-shard-${{ matrix.shard }}-${{ github.run_id }}
          path: |
            frontend/playwright-report
            frontend/test-results
          if-no-files-found: ignore
          retention-days: 7
```

Retain the existing full-suite push condition and quality-gate `needs` list. Neither Playwright job becomes advisory.

- [ ] **Step 4: Validate scripts and workflow content locally**

```powershell
$unitShards = 1..4 | ForEach-Object {
  $timer = [System.Diagnostics.Stopwatch]::StartNew()
  npm.cmd run test:unit:ci -w frontend -- --shard="$_/4"
  $code = $LASTEXITCODE
  $timer.Stop()
  if ($code -ne 0 -or $timer.Elapsed.TotalSeconds -ge 110) { throw "Unit shard $_ failed or exceeded its budget." }
}
npm.cmd run test:component -w frontend
npm.cmd run test:integration -w frontend
npm.cmd run test:scripts
```

Expected: every unit shard, component, integration, and script lane passes under 120 seconds. Validate the workflow with a YAML parser if available; otherwise inspect the GitHub Actions workflow editor after pushing the branch.

- [ ] **Step 5: Commit the CI changes**

```powershell
git add -- frontend/package.json .github/workflows/ci.yml
git commit -m "ci: parallelize frontend tests and upload E2E diagnostics"
```

### Task 5: Run the complete verification gate

**Files:**
- Read-only verification of all files changed in Tasks 1-4.
- Do not stage or alter unrelated files, including `frontend/playwright-report/index.html`, documentation artifacts, and current user-owned E2E fixture edits.

- [ ] **Step 1: Check the intended diff and worktree boundaries**

```powershell
git diff --check 9ab9cf6..HEAD
git status --short --untracked-files=all
```

Expected: the implementation commits contain only planned files and pre-existing user changes remain visible but unstaged.

- [ ] **Step 2: Run critical Playwright under CI configuration**

```powershell
$env:CI = "1"
npm run test:e2e:critical
Remove-Item Env:CI
```

Expected: all critical tests pass within 120 seconds.

- [ ] **Step 3: Run Full Playwright under CI configuration**

```powershell
$env:CI = "1"
npx.cmd playwright test --config=frontend/playwright.config.ts --workers=4 --shard=1/3 --reporter=line
npx.cmd playwright test --config=frontend/playwright.config.ts --workers=4 --shard=2/3 --reporter=line
npx.cmd playwright test --config=frontend/playwright.config.ts --workers=4 --shard=3/3 --reporter=line
Remove-Item Env:CI
```

Expected: all full-suite tests pass across three shards, each within 120 seconds, and the report is generated without timeout.

- [ ] **Step 4: Run non-E2E validation**

```powershell
npm run lint
npm run typecheck
npm run test:scripts
npm run test:documentation
npm run test:contract
npm run test:unit:ci -w frontend -- --shard=1/4
npm run test:unit:ci -w frontend -- --shard=2/4
npm run test:unit:ci -w frontend -- --shard=3/4
npm run test:unit:ci -w frontend -- --shard=4/4
npm run test:unit -w backend
npm run test:architecture -w backend
```

Expected: every command exits with code 0. Existing warnings are acceptable only when no assertion fails.

- [ ] **Step 5: Review final CI behavior**

Confirm from the workflow diff that Full Playwright and Critical Playwright are still blocking, the quality gate still fails on failure or cancellation, E2E failures upload diagnostics without creating a second failure, and the Playwright test budget is 110 seconds.
