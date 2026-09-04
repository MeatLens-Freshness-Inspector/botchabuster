# Fast, deterministic, blocking CI test gate

## Status

Design approved in discussion; implementation is in progress.

## Context

The GitHub `Automated Testing` workflow is failing because both Playwright lanes fail, which then correctly causes the aggregate `CI Quality Gate` to fail. The other validation lanes are passing. The E2E jobs currently provide little diagnostic output and the full suite runs serially, so a real failure can take approximately ten minutes to surface.

Local measurements on the current test suite provide a safe optimization target:

- Full Playwright: 119 tests, passed serially in 5.4 minutes.
- Full Playwright with four workers: 119 tests, passed in 1.5 minutes.
- Frontend unit tests: 384 tests, passed with eight-way Node test concurrency in 102.8 seconds.
- Frontend component and integration suites: 23 tests combined, passed in approximately 32 seconds.

Implementation measurements revised the execution layout without reducing coverage: the current full suite is 132 tests, and an unsharded four-worker run exceeds the 110-second Playwright budget. Three file-parallel shards were still too large for the slower GitHub runner, so the blocking suite uses four shards with a 110-second command guard. The current frontend unit suite is 388 tests; serialized execution took 252.4 seconds and eight-way in-process concurrency took 426.2 seconds, while four weighted file shards each passed in 25.1–26.3 seconds.

There are also known sources of future flakiness in the E2E data: browser/Node timezone defaults are not pinned, live pre-scan data contains dates that will eventually become historical, and developer-only scenarios need an explicit developer session in the test fixture.

## Goals

1. Keep Full Playwright as a required, blocking check on every push that exercises the frontend.
2. Keep the critical Playwright lane blocking as well.
3. Make every test execution lane finish within a 120-second budget, with enough margin to avoid normal CI overhead turning a passing suite into a timeout.
4. Make date-, timezone-, role-, and route-dependent tests deterministic across machines and future calendar dates.
5. Make a failure actionable from the GitHub job log and downloadable Playwright artifacts.
6. Preserve the quality gate's behavior: any failed or cancelled required test lane fails the gate.
7. Do not change production behavior merely to accommodate CI.

## Non-goals

- Moving Full Playwright to a non-blocking/nightly-only workflow.
- Skipping tests, weakening assertions, or accepting failures.
- Changing the application's business rules for past or future inspection dates.
- Optimizing dependency installation and browser download time as if it were test execution time; those setup steps will receive explicit job timeouts and caching remains a separate concern.

## Design

### 1. Deterministic Playwright execution

Update the Playwright configuration to use four workers with files parallelized but tests within each file kept serial, and one worker locally by default. Keep the suite's current file isolation settings, and first fix any shared-state assumptions exposed by parallel execution rather than reducing coverage. Run the full suite as four CI shards so every shard stays below the explicit 110-second budget, including slower GitHub-hosted runners. Use a CI-friendly list reporter alongside the HTML reporter, pin the browser timezone to UTC, and set an explicit test-run budget below two minutes.

Use one retry in CI only for collecting a trace and distinguishing a transient failure; a retry must not hide the final failure. Keep `forbidOnly` enabled in CI.

### 2. Future-proof test data

Add a small test-only date helper that derives a valid live date from the current UTC date, for example a date 30 days in the future, and use it anywhere an E2E flow requires a currently valid expiry/pre-scan date. Keep fixed dates only in tests whose purpose is historical data, date formatting, or explicit boundary behavior.

Pin CI's `TZ` environment to UTC so Node-side date formatting agrees with the browser. Make the shared session fixture model developer access explicitly and update developer-only journeys to request that role.

### 3. Parallel, diagnosable route coverage

Refactor the legacy route contract from one serial loop into independently named tests, one route per test. This preserves coverage while allowing Playwright workers to isolate failures and prevents one route contract from requiring an oversized per-test timeout. Each failure should identify its exact route.

### 4. Parallel frontend validation lanes

Run frontend component and integration suites as separate matrix entries, and run the unit suite as four deterministic, weighted file-shard entries so they execute concurrently and report the failing lane directly. The sharder estimates file cost from test count, source size, component overhead, and measured slow-file overrides, then assigns expensive files to the lightest bucket. Keep the local serialized unit script unchanged because in-process concurrency is slower and less predictable. The matrix must still aggregate as one required frontend validation result for the quality gate.

### 5. CI diagnostics and bounded jobs

Add explicit `timeout-minutes` values to the E2E jobs that allow dependency/browser setup but prevent a hung job from consuming ten minutes. On E2E failure, upload `frontend/playwright-report` and `frontend/test-results` when present. Keep artifacts optional on success and ignore missing paths so artifact collection cannot create a second unrelated failure.

The quality gate remains the final blocking status and should continue to summarize all required job results. Improve its output only as needed to show the named matrix/E2E statuses clearly.

## Acceptance criteria

- `npm run test:e2e:critical` passes locally within 120 seconds.
- All four `npm run test:e2e:full -- --shard=N/4` lanes pass locally within 120 seconds using the CI worker configuration.
- All four unit shards, component, and integration validation pass within 120 seconds; the frontend validation matrix completes concurrently.
- Repeated E2E runs use the same UTC interpretation and do not rely on a hardcoded live date that becomes invalid as the calendar advances.
- Developer-only E2E journeys pass with the explicit developer fixture.
- A deliberately failing E2E test produces a named failure in the log and an available Playwright report/trace artifact, then causes the quality gate to fail.
- The workflow continues to run the blocking full suite on every applicable push; no test lane is made advisory.
- Fresh local verification passes for the changed test/configuration scripts and the complete relevant test commands.

## Rollback and risk controls

If parallel execution exposes a shared-state defect, isolate the fixture or test data that leaks state and rerun the affected lane. Do not disable parallelism for the entire suite or remove coverage as a workaround. If a CI runner is consistently slower than the measured margin, use the timing output to optimize the slow test group while keeping the explicit two-minute budget visible.
