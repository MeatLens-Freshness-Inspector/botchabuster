# CSRF Refresh Retry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover expired or stale frontend CSRF tokens transparently and retry one failed mutating API request so long-lived admin pages can update users successfully.

**Architecture:** Keep CSRF validation unchanged on the backend. Add a refresh-handler registry and single-flight refresh promise to `apiRequest.ts`; make `fetchWithTimeout.ts` detect only the backend’s invalid-CSRF response and retry once with the refreshed token. `AuthProvider` registers a handler that calls `AuthClient.getSession()` and returns the new bootstrap CSRF token.

**Tech Stack:** TypeScript, React, Node’s built-in test runner, JSDOM, Vite frontend workspace.

## Global Constraints

- Do not change backend authorization or CSRF verification rules.
- Retry only a `403` response whose JSON `error` is `Invalid CSRF token`.
- Retry at most once per original request.
- Preserve unrelated working-tree changes in `frontend/src/lib/reports/pdf/reportCharts.ts` and `Screenshot 2026-08-06 162610.png`.
- Keep the design spec committed at `docs/superpowers/specs/2026-08-06-csrf-refresh-retry-design.md`.

---

### Task 1: Add failing request-layer regression tests

**Files:**
- Modify: `frontend/tests/unit/utilities/api-request-timeouts.unit.test.ts`
- Test: `frontend/tests/unit/utilities/api-request-timeouts.unit.test.ts`

**Interfaces:**
- Consumes: the existing `installDom`, `setStoredSession`, and response helpers.
- Produces: executable expectations for `fetchWithTimeout`, `setApiCsrfToken`, `setApiSessionRefreshHandler`, and `clearApiCsrfToken`.

- [ ] **Step 1: Import the request-layer APIs and fetch wrapper**

Add:
```ts
import {
  clearApiCsrfToken,
  setApiCsrfToken,
  setApiSessionRefreshHandler,
} from "../../../src/integrations/api/apiRequest";
import { fetchWithTimeout } from "../../../src/integrations/api/fetchWithTimeout";
```

- [ ] **Step 2: Write the expired-CSRF retry test**

Add a test that sets `csrf-expired`, registers a refresh handler returning `csrf-fresh`, returns a `403` JSON response with `{ error: "Invalid CSRF token" }` on the first fetch, and returns `200` on the second fetch. Assert the result is `200`, the handler ran once, and the request headers were `csrf-expired` then `csrf-fresh`.

- [ ] **Step 3: Write the non-CSRF 403 test**

Add a test that returns `403` with `{ error: "Admin access required" }`, registers a refresh handler that increments a counter, and asserts the response remains `403`, the handler count is `0`, and only one request was made.

- [ ] **Step 4: Clean global state in each test**

In each test’s `finally` block, call `setApiSessionRefreshHandler(null)`, `clearApiCsrfToken()`, restore `globalThis.fetch`, and restore JSDOM.

- [ ] **Step 5: Run the tests and verify RED**

Run:
```powershell
npm run test:unit -w frontend -- tests/unit/utilities/api-request-timeouts.unit.test.ts
```
Expected: the new tests fail because `setApiSessionRefreshHandler` is not implemented and the retry behavior does not exist.

- [ ] **Step 6: Commit the failing tests**

```powershell
git add frontend/tests/unit/utilities/api-request-timeouts.unit.test.ts
git commit -m "test: cover csrf refresh retry behavior"
```

---

### Task 2: Add the refresh-handler and single-flight primitives

**Files:**
- Modify: `frontend/src/integrations/api/apiRequest.ts`
- Test: `frontend/tests/unit/utilities/api-request-timeouts.unit.test.ts`

**Interfaces:**
- Consumes: the failing tests from Task 1.
- Produces: `setApiSessionRefreshHandler(handler)` and `refreshApiSessionForCsrf()`, where the latter returns `Promise<string | null>`.

- [ ] **Step 1: Define the refresh handler type and state**

Add:
```ts
export type ApiSessionRefreshHandler = () => Promise<string | null>;

let apiSessionRefreshHandler: ApiSessionRefreshHandler | null = null;
let apiSessionRefreshPromise: Promise<string | null> | null = null;
```

- [ ] **Step 2: Implement handler registration**

Add:
```ts
export function setApiSessionRefreshHandler(
  handler: ApiSessionRefreshHandler | null,
): void {
  apiSessionRefreshHandler = handler;
}
```

- [ ] **Step 3: Implement single-flight refresh with safe failure**

Add `refreshApiSessionForCsrf()` that returns `null` when no handler exists or the handler rejects. If a refresh is already in flight, return that same promise. Clear the shared promise in `finally` so a later failure can retry on a future request.

- [ ] **Step 4: Run the focused tests**

Run:
```powershell
npm run test:unit -w frontend -- tests/unit/utilities/api-request-timeouts.unit.test.ts
```
Expected: the tests still fail because `fetchWithTimeout` has not yet connected the refresh primitive to failed responses.

- [ ] **Step 5: Commit the request-layer primitive**

```powershell
git add frontend/src/integrations/api/apiRequest.ts
git commit -m "feat: add single-flight csrf refresh hook"
```

---

### Task 3: Implement one-time invalid-CSRF retry

**Files:**
- Modify: `frontend/src/integrations/api/fetchWithTimeout.ts`
- Test: `frontend/tests/unit/utilities/api-request-timeouts.unit.test.ts`

**Interfaces:**
- Consumes: `refreshApiSessionForCsrf()` and the current `fetchWithTimeout` timeout behavior.
- Produces: the same `fetchWithTimeout(input, init, timeoutMs)` response contract, with one bounded retry for invalid-CSRF responses.

- [ ] **Step 1: Extract the existing timeout-wrapped fetch into a private helper**

Preserve abort propagation, timeout error text, and cleanup exactly as currently implemented in a helper such as `fetchOnceWithTimeout`.

- [ ] **Step 2: Detect only invalid-CSRF responses**

Add a private async predicate that checks `response.status === 403`, clones the response, parses JSON, and returns true only when the trimmed `error` field equals `Invalid CSRF token`. A parse failure returns false.

- [ ] **Step 3: Refresh and retry once**

After the first response, call the predicate. If true, call `refreshApiSessionForCsrf()`. If it returns a non-empty token, clone the original request headers, set `X-CSRF-Token` to that token, and call the timeout helper once more with the same input, body, method, and timeout. Return the retry response. If no token is returned, return the original response.

- [ ] **Step 4: Run the focused tests and existing timeout tests**

Run:
```powershell
npm run test:unit -w frontend -- tests/unit/utilities/api-request-timeouts.unit.test.ts
```
Expected: all tests in the file pass, including the new red-green regression tests and the existing timeout assertions.

- [ ] **Step 5: Commit the retry implementation**

```powershell
git add frontend/src/integrations/api/fetchWithTimeout.ts
git commit -m "fix: retry requests after csrf refresh"
```

---

### Task 4: Register auth session refresh in AuthProvider

**Files:**
- Modify: `frontend/src/contexts/AuthContext.tsx`
- Test: `frontend/tests/unit/state/auth-context-session-cleanup.unit.test.tsx`

**Interfaces:**
- Consumes: `setApiSessionRefreshHandler`, `setApiCsrfToken`, and `authClient.getSession()`.
- Produces: a mounted `AuthProvider` registration that refreshes the token through the existing auth bootstrap endpoint and unregisters on cleanup.

- [ ] **Step 1: Register the callback in an effect**

Add an effect that calls `setApiSessionRefreshHandler(async () => {
  const payload = await authClient.getSession();
  setApiCsrfToken(payload.csrfToken);
  return payload.csrfToken;
})` and returns cleanup that calls `setApiSessionRefreshHandler(null)`.

- [ ] **Step 2: Add provider lifecycle coverage**

Extend the existing auth-context cleanup test to render `AuthProvider`, confirm the registered handler can be invoked with the mocked bootstrap payload, and confirm unmounting removes the handler. Keep the test’s existing auth/session cleanup assertions intact.

- [ ] **Step 3: Run state and request tests**

Run:
```powershell
npm run test:unit -w frontend -- tests/unit/state/auth-context-session-cleanup.unit.test.tsx tests/unit/utilities/api-request-timeouts.unit.test.ts
```
Expected: all selected tests pass.

- [ ] **Step 4: Commit the provider integration**

```powershell
git add frontend/src/contexts/AuthContext.tsx frontend/tests/unit/state/auth-context-session-cleanup.unit.test.tsx
git commit -m "fix: register auth session csrf refresh"
```

---

### Task 5: Verify the complete change

**Files:**
- No new production files.
- Inspect: all files changed by Tasks 1–4.

- [ ] **Step 1: Run frontend typechecking**

```powershell
npm run typecheck -w frontend
```
Expected: exit code 0.

- [ ] **Step 2: Run frontend linting**

```powershell
npm run lint -w frontend
```
Expected: exit code 0 with no new errors.

- [ ] **Step 3: Run the repository CI test command**

```powershell
npm run test:ci
```
Expected: exit code 0 and all configured test suites pass.

- [ ] **Step 4: Inspect the final diff and status**

```powershell
git diff HEAD~4..HEAD --check
git status --short
git log --oneline -8
```
Expected: no whitespace errors; only the intended CSRF commits are ahead of the design commit; unrelated user changes remain unstaged and uncommitted.

- [ ] **Step 5: Commit only if verification requires a focused test or lint refinement**

```powershell
git add <only the verified refinement files>
git commit -m "test: refine csrf refresh verification"
```
