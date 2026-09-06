# CI Playwright Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

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

- [ ] **Step 1:** Capture the failed run IDs and local reproductions in the plan notes.
- [ ] **Step 2:** Commit the plan as an independently reviewable investigation record.

### Task 2: Centralize encrypted transport bootstrap for standalone E2E tests

**Files:**
- Modify: `frontend/tests/support/fixtures/transport.ts`
- Modify: `frontend/tests/e2e/journeys/inspector/terms-and-conditions.e2e.spec.ts`

**Interfaces:**
- Produce `mockTransportPublicKey(page: Page): Promise<void>` that registers `**/api/transport/public-key` and fulfills it with `transportPublicKeyResponse()`.
- Consume the helper from both signup tests before any encrypted API request.

- [ ] **Step 1:** Add the failing standalone-signup coverage that requires the transport public-key route and verify it fails because `/api/auth/sign-up` is never reached.
- [ ] **Step 2:** Implement the minimal shared route helper.
- [ ] **Step 3:** Register the helper in both signup tests.
- [ ] **Step 4:** Run the focused terms-and-conditions test and confirm all three tests pass.
- [ ] **Step 5:** Commit the helper and signup setup fix.

### Task 3: Make realtime handoff readiness observable in the E2E fixture

**Files:**
- Modify: `frontend/tests/e2e/journeys/inspector/messages-page.e2e.spec.ts`

**Interfaces:**
- Expose the existing `__userChatStreamOpenCount` through a small page-evaluation assertion; do not add production-only APIs.

- [ ] **Step 1:** Add an assertion that a replacement stream has opened after the refresh/reconnect action, then run the focused test to prove the current test emits its status event during the handoff window.
- [ ] **Step 2:** Keep the assertion event-based (`expect.poll` on the stream-open counter), not a fixed sleep.
- [ ] **Step 3:** Run the focused messages test and confirm the realtime-unavailable assertion passes.
- [ ] **Step 4:** Commit the deterministic handoff test.

### Task 4: Add regression coverage for message-stream status termination

**Files:**
- Modify: `frontend/tests/unit/features/messaging/use-message-stream.unit.test.tsx`

- [ ] **Step 1:** Add a unit test proving `realtime_unavailable` transitions the hook to `disconnected` and does not schedule an automatic retry.
- [ ] **Step 2:** Run the new test against the current implementation and verify it fails if the status callback is not honored.
- [ ] **Step 3:** Keep the production implementation unchanged if the test is already green; otherwise make the smallest root-cause fix in `frontend/src/features/messaging/model/use-message-stream.ts`.
- [ ] **Step 4:** Run the complete message-stream unit file and commit the regression coverage/fix.

### Task 5: Improve CI Playwright diagnostics without changing gates

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1:** Add explicit Playwright test-result and report paths to the failure summary while retaining artifact upload and the existing failure exit behavior.
- [ ] **Step 2:** Validate the YAML and inspect the rendered command forwarding for each shard.
- [ ] **Step 3:** Run the repository’s workflow/script checks and commit the additive diagnostics.

### Task 6: Document and verify the local CI-equivalent lanes

**Files:**
- Modify: `README.md`

- [ ] **Step 1:** Document the exact critical and four-shard Playwright commands, including the Node 22 requirement and bounded timeout.
- [ ] **Step 2:** Run lint, typecheck, affected unit suites, critical Playwright, and all four Playwright shards.
- [ ] **Step 3:** Commit the operational documentation.

### Task 7: Final quality gate and handoff

- [ ] **Step 1:** Review the diff for unrelated changes and confirm the existing dirty files remain untouched.
- [ ] **Step 2:** Run the smallest complete local equivalent of every affected CI job.
- [ ] **Step 3:** Confirm at least six commits exist and report remote CI as unverified unless a new Actions run is available.
