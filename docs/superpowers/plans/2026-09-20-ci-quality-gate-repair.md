# CI Quality Gate Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Restore the failing frontend unit shards and bounded critical Playwright lane while retaining every newly added analysis-model feature.

**Architecture:** Keep the model catalog and eager warmup implementation unchanged; update stale tests to assert the current catalog and all registered variants. Make Playwright worker parallelism configurable through an environment variable, and set a higher worker count only for the critical CI job so the full Playwright matrix keeps its existing resource profile.

**Tech Stack:** Node.js 22, TypeScript, Node test runner via tsx, Playwright, GitHub Actions YAML.

## Global Constraints

- Preserve all existing tests and newly added model variants.
- Keep CI test commands bounded by timeout 110s.
- Do not weaken assertions, skip tests, or make a failing lane advisory.
- Run targeted tests first, then the complete relevant local CI gate.
- Produce 5–15 coherent commits for this repair.

---

### Task 1: Record the plan and current failure evidence

**Files:**
- Create: docs/superpowers/plans/2026-09-20-ci-quality-gate-repair.md

- [x] Capture the failing commands.

~~~
$env:CI = "true"
npm run test:unit:ci -w frontend -- --shard=2/4
npm run test:unit:ci -w frontend -- --shard=4/4
npm run test:e2e:critical
~~~

Observed failures: the developer model-option contract omits Sep 18 MobileNetV3; the prewarm contract expects three fulfilled results although four MobileNet variants are registered; critical Playwright reaches the 110-second suite timeout after 41 of 44 tests.

- [x] Save this plan before implementation begins.

~~~
git status --short
~~~

Expected: only this plan is uncommitted before implementation begins.

- [ ] Commit the plan.

~~~
git add docs/superpowers/plans/2026-09-20-ci-quality-gate-repair.md
git commit -m "docs: plan CI quality gate repair"
~~~

### Task 2: Synchronize the developer model-option contract

**Files:**
- Modify: frontend/tests/unit/features/developer-tools/developer-ui.unit.test.ts

**Interfaces:**
- Consumes: ANALYSIS_MODEL_CATALOG and formatDeveloperModelOption.
- Produces: a regression contract covering primary, Sep 18, Seed123, legacy, ResNet50, and ensemble options.

- [ ] Re-run the focused failing test.

~~~
npx tsx --test frontend/tests/unit/features/developer-tools/developer-ui.unit.test.ts
~~~

Expected: one failure showing the actual catalog includes Sep 18 MobileNetV3 · Added Sep 18, 2026 and the primary date is Sep 19, 2026.

- [ ] Update the expected labels to the current catalog.

~~~ts
[
  "Primary MobileNetV3 · Added Sep 19, 2026",
  "Sep 18 MobileNetV3 · Added Sep 18, 2026",
  "Seed123 MobileNetV3 · Added May 19, 2026",
  "Legacy MobileNetV3 · Added May 5, 2026",
  "ResNet50 · Added May 1, 2026",
  "Ensemble · Composite mode",
]
~~~

- [ ] Run the focused test.

~~~
npx tsx --test frontend/tests/unit/features/developer-tools/developer-ui.unit.test.ts
~~~

Expected: all tests in the file pass.

- [ ] Commit the contract update.

~~~
git add frontend/tests/unit/features/developer-tools/developer-ui.unit.test.ts
git commit -m "test: cover all developer model options"
~~~

### Task 3: Synchronize the eager-prewarm contract

**Files:**
- Modify: frontend/tests/unit/features/offline-analysis/analysis-prewarm.unit.test.ts

**Interfaces:**
- Consumes: MOBILE_NET_MODEL_VARIANTS and loadAllAnalysisModels.
- Produces: a failure-isolation assertion that remains correct as the registered MobileNet variant list grows.

- [ ] Re-run the focused failing test.

~~~
npx tsx --test frontend/tests/unit/features/offline-analysis/analysis-prewarm.unit.test.ts
~~~

Expected: the first test passes and the isolation test fails because four of five settled loads are fulfilled, not three of four.

- [ ] Derive the fulfilled count from the registered variants.

Replace the fixed count assertion with:

~~~ts
assert.equal(results.filter((result) => result.status === "fulfilled").length, MOBILE_NET_MODEL_VARIANTS.length);
assert.equal(results.filter((result) => result.status === "rejected").length, 1);
~~~

- [ ] Run the focused test.

~~~
npx tsx --test frontend/tests/unit/features/offline-analysis/analysis-prewarm.unit.test.ts
~~~

Expected: both tests pass, including the new Sep 18 model variant.

- [ ] Commit the contract update.

~~~
git add frontend/tests/unit/features/offline-analysis/analysis-prewarm.unit.test.ts
git commit -m "test: keep prewarm failure isolation variant-safe"
~~~

### Task 4: Make critical Playwright parallelism explicit and bounded

**Files:**
- Modify: frontend/playwright.config.ts
- Modify: .github/workflows/ci.yml
- Modify: scripts/request-budget.test.mjs

**Interfaces:**
- Consumes: optional PLAYWRIGHT_WORKERS environment variable.
- Produces: CI critical Playwright runs with eight workers while local and full Playwright behavior remains unchanged.

- [ ] Add regression assertions before implementation.

Extend the Playwright CI test to require:

~~~js
assert.match(workflow, /PLAYWRIGHT_WORKERS:\s*8/);
const playwrightConfig = await read("frontend/playwright.config.ts");
assert.match(playwrightConfig, /process\.env\.PLAYWRIGHT_WORKERS/);
~~~

- [ ] Run the regression test to verify it fails for the missing configuration.

~~~
node --test scripts/request-budget.test.mjs
~~~

Expected: existing bounded-command assertions pass and the new worker-setting assertion fails.

- [ ] Commit the failing regression contract.

~~~
git add scripts/request-budget.test.mjs
git commit -m "test: require bounded critical Playwright parallelism"
~~~

- [ ] Implement configurable worker selection.

In frontend/playwright.config.ts, parse a positive integer from PLAYWRIGHT_WORKERS; use it when CI is set, otherwise retain four CI workers and one local worker:

~~~ts
const isCI = !!process.env.CI;
const configuredCiWorkers = Number.parseInt(process.env.PLAYWRIGHT_WORKERS ?? "", 10);
const ciWorkers = Number.isInteger(configuredCiWorkers) && configuredCiWorkers > 0
  ? configuredCiWorkers
  : 4;
~~~

Set workers to isCI ? ciWorkers : 1.

- [ ] Configure only the critical CI job.

Add this job-level environment setting under e2e-critical:

~~~yaml
env:
  PLAYWRIGHT_WORKERS: 8
~~~

Do not change the full Playwright matrix or either timeout 110s command.

- [ ] Run the regression test and bounded critical lane.

~~~
node --test scripts/request-budget.test.mjs
$env:CI = "true"
$env:PLAYWRIGHT_WORKERS = "8"
npm run test:e2e:critical
~~~

Expected: request-budget tests pass and all 44 critical Playwright tests pass within the 110-second suite budget.

- [ ] Commit the runner configuration.

~~~
git add frontend/playwright.config.ts .github/workflows/ci.yml
git commit -m "ci: parallelize critical Playwright lane"
~~~

### Task 5: Run the complete affected CI gate and finalize

**Files:**
- No additional implementation files; inspect all committed changes.

- [ ] Run both repaired unit shards.

~~~
$env:CI = "true"
npm run test:unit:ci -w frontend -- --shard=2/4
npm run test:unit:ci -w frontend -- --shard=4/4
~~~

Expected: both commands exit 0 with zero failed tests.

- [ ] Run the relevant frontend component and integration lanes.

~~~
npm run test:component -w frontend
npm run test:integration -w frontend
~~~

Expected: both commands exit 0.

- [ ] Run lint, typecheck, scripts, documentation, and frontend build.

~~~
npm run lint
npm run typecheck
npm run test:scripts
npm run test:documentation
npm run build:frontend
~~~

Expected: each command exits 0.

- [ ] Review the final diff and commit verification notes if needed.

~~~
git diff HEAD~4..HEAD --check
git status --short --branch
git log -5 --oneline
~~~

Expected: no whitespace errors, a clean worktree, and five coherent commits including this plan.

- [ ] Report exact verification evidence and remote-CI state.

If no push is performed, explicitly report that GitHub Actions remains unverified remotely; do not claim the remote run passed without fresh workflow output.
