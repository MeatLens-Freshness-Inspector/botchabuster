# CI Playwright Recovery Implementation Plan

**Status (2026-09-07): Complete.** The failing lanes were reproduced, fixed,
and re-run locally with the CI timeout and shard configuration. All planned
changes are committed in six or more focused commits; remote Actions has not
been re-run from this checkout.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Restore the failing push CI lanes by fixing the two reproducible Playwright regressions while preserving full coverage and making future failures diagnosable.

**Architecture:** Keep production behavior unchanged unless a regression test proves the message-stream handoff itself is incorrect. Centralize the encrypted transport public-key bootstrap in the Playwright fixture layer, and make the realtime test wait on the observable stream-open contract before injecting an event. Improve CI summaries only with additive diagnostics.

**Tech Stack:** GitHub Actions, npm workspaces, Playwright, React/TypeScript, Node test runner.

## Global Constraints

- Preserve all existing test coverage; do not skip or weaken assertions.
- Keep CI test lanes bounded by the existing 110-second command timeout and eight-minute job timeout.
- Preserve unrelated user changes already present in the worktree.
- Produce at least six coherent, non-empty commits.
- Run the smallest affected checks after each edit and the full relevant CI-equivalent checks before completion.

## Investigation evidence

- GitHub Actions push run `34036058091` passed dependency setup, lint/typecheck, unit/component/integration, backend, contract, and build jobs.
- Critical Playwright failed only `messages-page.e2e.spec.ts:283`; after emitting `realtime_unavailable`, the status remained `Live updates connected`.
- Full Playwright shard 3/4 reproduced the same message-stream status failure.
- Full Playwright shard 4/4 failed `terms-and-conditions.e2e.spec.ts:5`; the signup route was never reached because the standalone test did not mock the encrypted transport public-key bootstrap.
- Both failures reproduce locally with Playwright 1.57 under CI settings; no timeout increase or skipped test is acceptable.

---

### Task 1: Record the failing CI contract

**Files:**
- Create: `docs/superpowers/plans/2026-09-07-ci-playwright-recovery.md`

- [x] **Step 1:** Capture the failed run IDs and local reproductions in the plan notes.
- [x] **Step 2:** Commit the plan as an independently reviewable investigation record.

### Task 2: Centralize encrypted transport bootstrap for standalone E2E tests

**Files:**
- Modify: `frontend/tests/support/fixtures/transport.ts`
- Modify: `frontend/tests/e2e/journeys/inspector/terms-and-conditions.e2e.spec.ts`

**Interfaces:**
- Produce `mockTransportPublicKey(page: Page): Promise<void>` that registers `**/api/transport/public-key` and fulfills it with `transportPublicKeyResponse()`.
- Consume the helper from both signup tests before any encrypted API request.

- [x] **Step 1:** Add the failing standalone-signup coverage that requires the transport public-key route and verify it fails because `/api/auth/sign-up` is never reached.
- [x] **Step 2:** Implement the minimal shared route helper.
- [x] **Step 3:** Register the helper in both signup tests.
- [x] **Step 4:** Run the focused terms-and-conditions test and confirm all three tests pass.
- [x] **Step 5:** Commit the helper and signup setup fix.

### Task 3: Make realtime handoff readiness observable in the E2E fixture

**Files:**
- Modify: `frontend/tests/e2e/journeys/inspector/messages-page.e2e.spec.ts`

**Interfaces:**
- Expose the existing `__userChatStreamOpenCount` through a small page-evaluation assertion; do not add production-only APIs.

- [x] **Step 1:** Add assertions that a replacement stream has opened and completed its connected handshake after the refresh/reconnect action, then run the focused test to prove the terminal status is delivered to the active generation.
- [x] **Step 2:** Keep the assertions event-based (`expect.poll` on stream-open and handshake counters), not fixed sleeps.
- [x] **Step 3:** Run the focused messages test and confirm the realtime-unavailable assertion passes.
- [x] **Step 4:** Commit the deterministic handoff test.

### Task 4: Verify regression coverage for message-stream status termination

**Files:**
- Verify: `frontend/tests/unit/features/messaging/use-message-stream.unit.test.tsx`

- [x] **Step 1:** Verify the existing unit test proving `realtime_unavailable` transitions the hook to `disconnected` and does not schedule an automatic retry.
- [x] **Step 2:** Run the complete message-stream unit file as the regression check.
- [x] **Step 3:** Keep the production hook implementation unchanged because the existing unit coverage was already green; fix the proven abort-lifetime root cause in `frontend/src/shared/api/fetch-with-timeout.ts`.
- [x] **Step 4:** Add encrypted SSE integration coverage for the abort lifetime and commit the regression fix.

### Task 5: Improve CI Playwright diagnostics without changing gates

**Files:**
- Modify: `.github/workflows/ci.yml`

- [x] **Step 1:** Add explicit Playwright test-result and report paths to the failure summary while retaining artifact upload and the existing failure exit behavior.
- [x] **Step 2:** Validate the YAML and inspect the rendered command forwarding for each shard.
- [x] **Step 3:** Run the repository’s workflow/script checks and commit the additive diagnostics.

### Task 6: Document and verify the local CI-equivalent lanes

**Files:**
- Modify: `README.md`

- [x] **Step 1:** Document the exact critical and four-shard Playwright commands, including the Node 22 requirement and bounded timeout.
- [x] **Step 2:** Run lint, typecheck, affected unit suites, critical Playwright, and all four Playwright shards.
- [x] **Step 3:** Commit the operational documentation.

### Task 7: Final quality gate and handoff

- [x] **Step 1:** Review the diff for unrelated changes and confirm the existing dirty files remain untouched.
- [x] **Step 2:** Run the smallest complete local equivalent of every affected CI job.
- [x] **Step 3:** Confirm at least six commits exist and report remote CI as unverified unless a new Actions run is available.
