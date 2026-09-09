# Biometric Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add native Capacitor biometric login and offline unlock while preserving and hardening the existing WebAuthn/passkey login flow.

**Architecture:** Keep WebAuthn as the online server-verified passkey path. Add a project-owned frontend adapter over Capacitor biometric authentication and secure storage; the adapter stores a versioned native auth record containing the current MeatLens session credential and protected offline bootstrap data. `AuthProvider` remains the single coordinator for online, offline, lock, reconnect, and sign-out state.

**Tech Stack:** React 18, TypeScript, Vite, Capacitor 8, `@aparajita/capacitor-biometric-auth` 9.x, `@aparajita/capacitor-secure-storage` 8.x, WebAuthn, existing IndexedDB/SQLite offline storage, Node test runner, Playwright.

## Global Constraints

- Keep existing password, WebAuthn passkey, local-passkey, and offline-first behavior.
- Native biometric data never enters JavaScript, SQLite, the backend, or logs.
- Native session material never enters browser `localStorage`.
- Native vault reads require an explicit biometric/device-credential prompt.
- Offline unlock must enforce the existing `offlineExpiresAt` value.
- Sign-out, account switch, disable, profile removal, and vault corruption clear native material.
- `Lock` preserves the offline envelope and native enrollment.
- Do not weaken or skip existing CI lanes.
- Use `npm.cmd` in PowerShell commands because the local execution policy blocks `npm.ps1`.
- Preserve unrelated dirty-worktree files and stage only task files.
- Each task produces one coherent commit; the completed feature will have exactly 30 commits including the already-created design commit.

---

### Task 1: Approved Design Specification

**Files:**
- Existing: `docs/superpowers/specs/2026-09-09-biometric-login-design.md`

**Interfaces:**
- Produces the accepted architecture, security rules, offline behavior, testing strategy, and 30-commit scope for every later task.

- [x] Confirm the design covers WebAuthn, native biometric vault, offline unlock, reconnect, UX, security, tests, and cleanup.
- [x] Run `npm.cmd run test:documentation` and confirm `documentation validation passed`.
- [x] Commit `docs: approve biometric login design` as commit 1.

### Task 2: Implementation Plan

**Files:**
- Create: `docs/superpowers/plans/2026-09-09-biometric-login.md`

**Interfaces:**
- Produces this task-by-task plan and the 30-commit sequence used by the implementer.

- [ ] Confirm every design requirement maps to at least one later task.
- [ ] Run `rg -n -i "TBD|TODO|FIXME|fill in|implement later|appropriate error|similar to" docs/superpowers/plans/2026-09-09-biometric-login.md` and require no matches.
- [ ] Commit `docs: plan biometric login implementation` as commit 2.

### Task 3: Native Dependency Manifest

**Files:**
- Modify: `frontend/package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Adds `@aparajita/capacitor-biometric-auth` at `^9.1.2` and `@aparajita/capacitor-secure-storage` at `^8.0.0` to the frontend runtime dependencies.

- [ ] Write a dependency-resolution check in `frontend/tests/unit/features/native-biometric/dependency-resolution.unit.test.ts` that imports the adapter entry point without invoking native APIs.
- [ ] Run `npm.cmd install --ignore-scripts --no-audit --no-fund` and verify both packages appear in `package-lock.json` with Capacitor 8 peer compatibility.
- [ ] Run `npm.cmd exec --workspace frontend -- tsc --noEmit` and commit `build: add native biometric dependencies`.

### Task 4: Native Biometric Domain Contract

**Files:**
- Create: `frontend/src/features/native-biometric/model/native-biometric-types.ts`
- Create: `frontend/tests/unit/features/native-biometric/native-biometric-types.unit.test.ts`
- Modify: `frontend/src/features/native-biometric/index.ts`

**Interfaces:**

```ts
export type NativeBiometricErrorCode =
  | "unavailable"
  | "not-enrolled"
  | "cancelled"
  | "locked-out"
  | "vault-missing"
  | "vault-corrupt"
  | "storage-failed";

export interface NativeBiometricAvailability {
  isNative: boolean;
  isAvailable: boolean;
  isEnrolled: boolean;
  label: "fingerprint" | "face" | "biometric" | "unavailable";
}

export interface NativeBiometricError extends Error {
  code: NativeBiometricErrorCode;
  retryable: boolean;
}

export interface NativeBiometricAdapter {
  checkAvailability(): Promise<NativeBiometricAvailability>;
  hasRecord(): Promise<boolean>;
  authenticate(reason: "enroll" | "login" | "unlock"): Promise<void>;
  readRecord(): Promise<string>;
  writeRecord(serializedRecord: string): Promise<void>;
  clearRecord(): Promise<void>;
}
```

- [ ] Write tests for unavailable, available-and-enrolled, and stable error-code values.
- [ ] Run `npm.cmd exec --workspace frontend -- tsx --test "tests/unit/features/native-biometric/native-biometric-types.unit.test.ts"` and confirm RED before the implementation.
- [ ] Add the types and exports, rerun the same test to confirm GREEN, and commit `feat: define native biometric domain contract`.

### Task 5: Browser-Safe Adapter

**Files:**
- Create: `frontend/src/features/native-biometric/api/browser-native-biometric.ts`
- Create: `frontend/tests/unit/features/native-biometric/browser-native-biometric.unit.test.ts`

**Interfaces:**
- `createBrowserNativeBiometricAdapter(): NativeBiometricAdapter` always returns `isNative: false`, `isAvailable: false`, `isEnrolled: false`, and throws `unavailable` for authentication/storage operations.

- [ ] Write tests that call every adapter method and assert browser-safe results or the normalized `unavailable` error.
- [ ] Run the targeted test and confirm it fails because the factory does not exist.
- [ ] Implement the no-op adapter and run the targeted test plus `npm.cmd exec --workspace frontend -- tsc --noEmit`; commit `feat: add browser biometric fallback`.

### Task 6: Capacitor Availability Adapter

**Files:**
- Create: `frontend/src/features/native-biometric/api/capacitor-native-biometric.ts`
- Create: `frontend/src/features/native-biometric/api/native-biometric-factory.ts`
- Create: `frontend/tests/unit/features/native-biometric/capacitor-native-biometric.unit.test.ts`

**Interfaces:**
- `createCapacitorNativeBiometricAdapter()` wraps `BiometricAuth.checkBiometry()` and maps the result to `NativeBiometricAvailability`.
- `getNativeBiometricAdapter()` selects the Capacitor adapter only when `Capacitor.isNativePlatform()` is true; otherwise it returns the browser adapter.

- [ ] Write tests with injected `checkBiometry`, `authenticate`, `SecureStorage.get`, `SecureStorage.set`, and `SecureStorage.remove` functions; assert that web selection never imports or calls native storage.
- [ ] Run the targeted test and confirm RED because the factory and native adapter are absent.
- [ ] Implement the adapter using `BiometricAuth.checkBiometry()` and `BiometricAuth.authenticate({ reason, allowDeviceCredential: true, androidTitle: "MeatLens biometric login" })`; run the targeted test and commit `feat: detect native biometric capability`.

### Task 7: Native Error Normalization

**Files:**
- Modify: `frontend/src/features/native-biometric/api/capacitor-native-biometric.ts`
- Create: `frontend/src/features/native-biometric/model/native-biometric-errors.ts`
- Create: `frontend/tests/unit/features/native-biometric/native-biometric-errors.unit.test.ts`

**Interfaces:**
- `normalizeNativeBiometricError(error: unknown): NativeBiometricError` maps `userCancel`/`systemCancel` to `cancelled`, `biometryLockout` to `locked-out`, `biometryNotAvailable`/`biometryNotEnrolled`/`passcodeNotSet` to `unavailable` or `not-enrolled`, and unknown storage failures to `storage-failed`.
- `getNativeBiometricMessage(error: unknown, action: "login" | "unlock" | "enroll"): string` returns safe user-facing copy without exposing plugin details.

- [ ] Write one test per mapping and assert retryability: cancellation is retryable, lockout is not immediately retryable, storage corruption is recoverable by clearing the vault.
- [ ] Run the error test and confirm RED.
- [ ] Implement mapping and messages, rerun the error test and the Capacitor adapter test, and commit `feat: normalize biometric errors`.

### Task 8: Versioned Native Auth Record

**Files:**
- Create: `frontend/src/features/native-biometric/model/native-auth-record.ts`
- Create: `frontend/tests/unit/features/native-biometric/native-auth-record.unit.test.ts`

**Interfaces:**

```ts
export const NATIVE_AUTH_RECORD_VERSION = 1;

export interface NativeAuthRecord {
  version: 1;
  userId: string;
  session: AuthSession | null;
  offlineEnvelope: OfflineAuthEnvelope;
  authenticatedAt: string;
  expiresAt: string;
}

export function serializeNativeAuthRecord(record: NativeAuthRecord): string;
export function parseNativeAuthRecord(serialized: string): NativeAuthRecord;
export function assertNativeAuthRecord(record: unknown): asserts record is NativeAuthRecord;
```

- [ ] Write tests for valid serialization, malformed JSON, unsupported version, missing user ID, invalid expiration, and mismatched envelope user ID.
- [ ] Run the record test and confirm RED.
- [ ] Implement strict validation and serialization using `JSON.stringify`/`JSON.parse` with no secret logging; run the record test and commit `feat: add versioned native auth record`.

### Task 9: Secure Storage Boundary

**Files:**
- Create: `frontend/src/features/native-biometric/api/native-secure-storage.ts`
- Create: `frontend/tests/unit/features/native-biometric/native-secure-storage.unit.test.ts`

**Interfaces:**
- `NativeSecureStorage` exposes `get(key): Promise<string | null>`, `set(key, value): Promise<void>`, and `remove(key): Promise<void>`.
- `createNativeSecureStorage()` configures the secure-storage prefix `meatlens_`, disables iCloud synchronization for this auth record, and uses `KeychainAccess.whenPasscodeSetThisDeviceOnly` on iOS.

- [ ] Write tests proving the wrapper serializes only string values, passes the fixed key prefix, and translates plugin failures into `storage-failed`.
- [ ] Run the targeted test and confirm RED.
- [ ] Implement the wrapper around `SecureStorage.setKeyPrefix`, `setSynchronize(false)`, `setDefaultKeychainAccess`, `get`, `set`, and `remove`; run tests and commit `feat: add secure native storage boundary`.

### Task 10: Vault Enrollment API

**Files:**
- Create: `frontend/src/features/native-biometric/api/native-auth-vault.ts`
- Create: `frontend/tests/unit/features/native-biometric/native-auth-vault-enroll.unit.test.ts`

**Interfaces:**
- `NativeAuthVault.enroll(input: { userId: string; session: AuthSession | null; offlineEnvelope: OfflineAuthEnvelope }): Promise<void>` authenticates with reason `enroll`, builds a versioned record, and writes it to the secure storage key `auth-record`.

- [ ] Write a failing test that rejects a record whose envelope user ID differs from the requested user ID and does not write storage.
- [ ] Run the targeted test and confirm RED.
- [ ] Implement the validation, prompt, serialization, and write sequence; run the targeted test and commit `feat: enroll native biometric vault`.

### Task 11: Vault Unlock API

**Files:**
- Modify: `frontend/src/features/native-biometric/api/native-auth-vault.ts`
- Create: `frontend/tests/unit/features/native-biometric/native-auth-vault-unlock.unit.test.ts`

**Interfaces:**
- `NativeAuthVault.unlock(reason: "login" | "unlock"): Promise<NativeAuthRecord>` authenticates first, then reads and parses `auth-record`.
- A missing value throws `vault-missing`; malformed data throws `vault-corrupt` and does not return partial state.

- [ ] Write tests asserting authentication happens before storage read, missing data maps to `vault-missing`, and malformed data maps to `vault-corrupt`.
- [ ] Run the targeted test and confirm RED.
- [ ] Implement unlock and rerun the targeted test plus the record tests; commit `feat: unlock native biometric vault`.

### Task 12: Vault Update API

**Files:**
- Modify: `frontend/src/features/native-biometric/api/native-auth-vault.ts`
- Create: `frontend/tests/unit/features/native-biometric/native-auth-vault-update.unit.test.ts`

**Interfaces:**
- `NativeAuthVault.update(input: { userId: string; session: AuthSession | null; offlineEnvelope: OfflineAuthEnvelope }): Promise<void>` reads the current record without a second prompt during an already-authenticated online session, validates the same user, and replaces the record.

- [ ] Write tests for same-user update, mismatched-user rejection, and no-op behavior when no native record exists.
- [ ] Run the targeted test and confirm RED.
- [ ] Implement the update method and commit `feat: update native biometric session record` after the targeted test passes.

### Task 13: Vault Clear and Invalidation

**Files:**
- Modify: `frontend/src/features/native-biometric/api/native-auth-vault.ts`
- Create: `frontend/tests/unit/features/native-biometric/native-auth-vault-clear.unit.test.ts`

**Interfaces:**
- `NativeAuthVault.clear(): Promise<void>` removes `auth-record` and treats a missing record as success.
- `clearAfterCorruption(): Promise<void>` removes the record and returns a safe `vault-corrupt` recovery state to callers.

- [ ] Write tests for idempotent clear and corruption recovery.
- [ ] Run the targeted test and confirm RED.
- [ ] Implement clear/invalidation and commit `feat: clear invalid native biometric vaults`.

### Task 14: Native Offline Envelope Integration

**Files:**
- Create: `frontend/src/entities/user/model/native-biometric-envelope.ts`
- Create: `frontend/tests/unit/entities/user/native-biometric-envelope.unit.test.ts`
- Modify: `frontend/src/features/native-biometric/api/native-auth-vault.ts`

**Interfaces:**
- `createNativeAuthRecordFromBootstrap(payload, offlineEnvelope): NativeAuthRecord` copies only the accepted bootstrap fields.
- `isNativeRecordExpired(record, nowMs = Date.now()): boolean` compares `record.expiresAt` and `offlineEnvelope.offlineExpiresAt`.
- `restoreOfflineEnvelopeFromNativeRecord(record): OfflineAuthEnvelope` always sets `offlineUnlockRequired: false` only after successful vault authentication.

- [ ] Write tests for offline expiry, user ID matching, and restoration preserving roles/profile/local-passkey data without exposing the session as an offline API token.
- [ ] Run the targeted test and confirm RED.
- [ ] Implement the pure functions and commit `feat: protect native offline envelope copy`.

### Task 15: Online Credential Restoration

**Files:**
- Create: `frontend/src/features/native-biometric/model/native-online-restore.ts`
- Create: `frontend/tests/unit/features/native-biometric/native-online-restore.unit.test.ts`

**Interfaces:**
- `restoreNativeOnlineSession(record, dependencies)` writes the native session into the existing session cache only in memory/session storage, calls `authClient.getSession()`, and returns `AuthBootstrapPayload` or a typed `expired` result.
- It never writes the token to localStorage.

- [ ] Write tests for valid online restore, expired-token fallback, and ensuring `USER_STORAGE_KEY` is not used for session credentials.
- [ ] Run the targeted test and confirm RED.
- [ ] Implement restore with existing `setCachedAuth`/`authClient.getSession` boundaries and commit `feat: restore online session from native vault`.

### Task 16: Offline Biometric Restoration

**Files:**
- Create: `frontend/src/features/native-biometric/model/native-offline-restore.ts`
- Create: `frontend/tests/unit/features/native-biometric/native-offline-restore.unit.test.ts`

**Interfaces:**
- `restoreNativeOfflineSession(record, nowMs): OfflineAuthEnvelope` rejects expired records and returns an unlocked envelope for valid records.

- [ ] Write tests for valid restore, expired restore, mismatched current user, and preservation of offline roles and profile.
- [ ] Run the targeted test and confirm RED.
- [ ] Implement the pure restore operation and commit `feat: restore offline mode with biometrics`.

### Task 17: Reconnect Upgrade Handling

**Files:**
- Modify: `frontend/src/entities/user/model/session-context.ts`
- Modify: `frontend/src/app/providers/auth-provider.tsx`
- Create: `frontend/tests/unit/state/native-biometric-reconnect.unit.test.tsx`

**Interfaces:**
- Extend the auth context with `nativeBiometricAvailable`, `nativeBiometricEnrolled`, `canUseNativeBiometricLogin`, `enableNativeBiometricLogin`, `disableNativeBiometricLogin`, and `signInWithNativeBiometric`.
- On `online`, call native-session restoration only if the native record is enrolled and the current state is offline-authenticated or offline-locked; leave safe offline state on failure.

- [ ] Write tests for offline-to-online upgrade, expired online credential with continued offline state, and no reconnect attempt for anonymous state.
- [ ] Run the targeted test and confirm RED.
- [ ] Implement the reconnect branch without changing existing WebAuthn behavior and commit `feat: upgrade native sessions on reconnect`.

### Task 18: Auth Provider Integration

**Files:**
- Modify: `frontend/src/app/providers/auth-provider.tsx`
- Modify: `frontend/src/entities/user/model/session-context.ts`
- Create: `frontend/tests/unit/state/native-biometric-auth-provider.unit.test.tsx`

**Interfaces:**
- `enableNativeBiometricLogin()` requires `authMode === "online-authenticated"`, the current user, current session, and a valid current offline envelope.
- `signInWithNativeBiometric()` chooses online restore when `navigator.onLine` and valid offline restore otherwise, then returns `{ isAdmin: boolean }`.
- `disableNativeBiometricLogin()` clears the vault but does not clear the active online session.

- [ ] Write provider tests for enrollment, native login online, native login offline, disable, and vault-corrupt cleanup.
- [ ] Run the provider test and confirm RED.
- [ ] Implement context actions and commit `feat: integrate native biometrics into auth provider`.

### Task 19: Native Login Hook Actions

**Files:**
- Modify: `frontend/src/features/auth/model/use-login.ts`
- Modify: `frontend/src/features/auth/model/login.ts`
- Create: `frontend/tests/unit/features/auth/native-login-actions.unit.test.tsx`

**Interfaces:**
- Extend `LoginAuthActions` with `canUseNativeBiometricLogin`, `signInWithNativeBiometric`, and `nativeBiometricError`.
- Add `handleNativeBiometricSignIn()` with the same loading/toast/navigation lifecycle as the existing passkey action.
- Add `getNativeBiometricLoginLabel(isOffline: boolean): string` returning `Unlock with Device Biometrics` or `Sign In with Device Biometrics`.

- [ ] Write tests for online label, offline label, disabled state, and error fallback.
- [ ] Run the targeted test and confirm RED.
- [ ] Implement hook/model changes and commit `feat: add native biometric login actions`.

### Task 20: Login Page Capability State

**Files:**
- Modify: `frontend/src/pages/auth/components/login-page-view.tsx`
- Modify: `frontend/src/features/auth/model/use-login.ts`
- Create: `frontend/tests/unit/pages/native-biometric-login-page.unit.test.tsx`

**Interfaces:**
- The page renders the native action only when `canUseNativeBiometricLogin` is true and the page is running natively.
- Native loading disables password, passkey, and native actions simultaneously.

- [ ] Write a failing component test asserting native action visibility and accessible label.
- [ ] Run the targeted component test and confirm RED.
- [ ] Add the button with `Fingerprint`, `Loader2`, `aria-label`, and normalized error behavior; rerun the test and commit `feat: expose native biometrics on login page`.

### Task 21: Login Page Biometric UX

**Files:**
- Modify: `frontend/src/pages/auth/components/login-page-view.tsx`
- Modify: `frontend/src/features/auth/model/login.ts`
- Modify: `frontend/tests/e2e/journeys/inspector/passkey-auth.e2e.spec.ts`

**Interfaces:**
- Keep `Sign In with Passkey` separate from `Sign In with Device Biometrics`.
- On offline lock, show native biometric unlock alongside existing local-passkey unlock when both are available.

- [ ] Add an E2E assertion that WebAuthn passkey UI remains visible and distinct when native capability is mocked.
- [ ] Run `npm.cmd exec --workspace frontend -- playwright test tests/e2e/journeys/inspector/passkey-auth.e2e.spec.ts` and confirm the regression test passes.
- [ ] Add the native copy/spacing and commit `fix: separate passkey and native biometric actions`.

### Task 22: Profile Enrollment UI

**Files:**
- Modify: `frontend/src/features/profile-editing/model/use-profile-editor.ts`
- Modify: `frontend/src/widgets/profile/profile-widget.tsx`
- Modify: `frontend/src/widgets/profile/profile-primary-column.tsx`
- Create: `frontend/tests/unit/features/profile-editing/native-biometric-profile.unit.test.tsx`

**Interfaces:**
- `useProfileEditor()` exposes `nativeBiometricAvailable`, `nativeBiometricEnrolled`, `isEnrollingNativeBiometric`, `handleEnableNativeBiometric`, and `handleDisableNativeBiometric`.
- `ProfilePrimaryColumn` receives those values and callbacks without importing `AuthProvider` directly.

- [ ] Write a failing component test for **Enable biometric login** visibility, disabled unavailable state, and enrollment loading.
- [ ] Run the targeted test and confirm RED.
- [ ] Wire the profile editor to `useAuth()` and add the focused card; rerun the test and commit `feat: add native biometric enrollment controls`.

### Task 23: Profile Disable and Status UI

**Files:**
- Modify: `frontend/src/widgets/profile/profile-primary-column.tsx`
- Modify: `frontend/tests/e2e/journeys/inspector/passkey-auth.e2e.spec.ts`
- Create: `frontend/tests/unit/widgets/profile/native-biometric-status.unit.test.tsx`

**Interfaces:**
- Enabled state displays **Biometric login enabled** and a **Disable biometric login** action.
- Disable action calls the auth context clear operation and keeps the active session unchanged.

- [ ] Write tests for enabled status, disable callback, unavailable copy, and accessible button names.
- [ ] Run the targeted test and confirm RED.
- [ ] Implement the status/disable UI and add an E2E profile assertion; commit `feat: add native biometric profile status`.

### Task 24: Sign-Out and Account-Switch Cleanup

**Files:**
- Modify: `frontend/src/app/providers/auth-provider.tsx`
- Modify: `frontend/src/features/native-biometric/api/native-auth-vault.ts`
- Create: `frontend/tests/unit/state/native-biometric-cleanup.unit.test.tsx`

**Interfaces:**
- `signOut()` clears native vault after server sign-out and offline envelope cleanup.
- `clearInMemoryAuthState()` never leaves a native record for the previous user.
- `enableNativeBiometricLogin()` rejects if a vault record belongs to another user.

- [ ] Write tests for sign-out cleanup, account mismatch, and idempotent cleanup after a 401/404 sign-out response.
- [ ] Run the targeted test and confirm RED.
- [ ] Implement cleanup ordering and commit `fix: clear native biometric auth on sign-out`.

### Task 25: Frontend Adapter and Vault Unit Suite

**Files:**
- Modify: `frontend/tests/unit/features/native-biometric/*.unit.test.ts`
- Create: `frontend/tests/unit/features/native-biometric/native-biometric-public-api.unit.test.ts`
- Modify: `frontend/src/features/native-biometric/index.ts`

**Interfaces:**
- The public feature barrel exports only the adapter factory, vault type, record type, availability type, error type, and user-safe error mapper.
- Internal plugin imports remain outside page/widget files.

- [ ] Add public API tests that assert all supported exports and reject accidental plugin leakage from UI modules.
- [ ] Run `npm.cmd exec --workspace frontend -- tsx --test "tests/unit/features/native-biometric/**/*.test.ts"` and require all targeted tests to pass.
- [ ] Run `npm.cmd run lint -w frontend` and commit `test: cover native biometric adapter and vault contracts`.

### Task 26: Auth Provider and Offline Integration Suite

**Files:**
- Modify: `frontend/tests/unit/state/auth-context-offline.unit.test.tsx`
- Modify: `frontend/tests/unit/state/auth-context-session-cleanup.unit.test.tsx`
- Create: `frontend/tests/integration/auth/native-biometric.integration.test.tsx`

**Interfaces:**
- Integration coverage exercises actual provider state transitions with a fake `NativeAuthVault`, fake online/offline network state, and the existing offline envelope store.

- [ ] Add failing integration cases for online native login, offline native unlock, expired native record, reconnect, and sign-out.
- [ ] Run `npm.cmd exec --workspace frontend -- tsx --test "tests/integration/auth/native-biometric.integration.test.tsx"` and confirm each new case fails for the missing behavior.
- [ ] Implement/adjust only the integration seams needed by the provider, run the full auth-context unit set, and commit `test: verify native biometric auth state transitions`.

### Task 27: Native Biometric Playwright Journeys

**Files:**
- Create: `frontend/tests/e2e/journeys/inspector/native-biometric-auth.e2e.spec.ts`
- Modify: `frontend/playwright.config.ts` only if the existing app fixture cannot expose a native mock.

**Interfaces:**
- The E2E test injects a deterministic `window.__MEATLENS_NATIVE_BIOMETRIC_TEST__` adapter before navigation and verifies the real login/profile UI.

- [ ] Write journeys for enrollment, online login, offline unlock, cancelled prompt, expired offline record, disable, and sign-out.
- [ ] Run `npm.cmd exec --workspace frontend -- playwright test tests/e2e/journeys/inspector/native-biometric-auth.e2e.spec.ts` and fix only real product/fixture failures.
- [ ] Commit `test: add native biometric Playwright journeys`.

### Task 28: WebAuthn Regression and Security Coverage

**Files:**
- Modify: `frontend/tests/e2e/journeys/inspector/passkey-auth.e2e.spec.ts`
- Modify: `backend/tests/unit/auth/module-passkey-service.unit.test.ts`
- Modify: `backend/tests/integration/auth/cookie-session.integration.test.ts`
- Create: `backend/tests/integration/auth/passkey-biometric-regression.integration.test.ts`

**Interfaces:**
- Existing WebAuthn flows continue to require user verification, one-time challenge consumption, correct origin/RP ID, counter updates, rate limiting, and application session issuance.

- [ ] Add failing regression assertions for one-time challenge use, invalid origin, missing credential, native UI coexistence, and session bootstrap shape.
- [ ] Run targeted frontend and backend passkey tests and confirm RED for each new assertion.
- [ ] Implement only regressions exposed by the new integration; run backend auth suites and commit `test: preserve WebAuthn biometric security guarantees`.

### Task 29: Platform Setup and User Documentation

**Files:**
- Modify: `ios/App/App/Info.plist`
- Modify: `documentation/GETTING_STARTED.md`
- Modify: `documentation/DEPLOYMENT.md`
- Modify: `documentation/API_REFERENCE.md`
- Create: `documentation/biometric-login.md`
- Modify: `scripts/check-documentation.mjs` only if the new document needs explicit validation.

**Interfaces:**
- iOS includes `NSFaceIDUsageDescription` with user-facing MeatLens copy.
- Documentation describes WebAuthn vs native biometric login, offline expiry, Android/iOS setup, fallback behavior, sign-out cleanup, and no biometric data transmission.

- [ ] Write the user/developer documentation and iOS permission entry.
- [ ] Run `npm.cmd run test:documentation` and verify `documentation validation passed`.
- [ ] Commit `docs: document biometric login and native setup`.

### Task 30: Full Verification and Quality-Gate Fixes

**Files:**
- Modify only files required by fresh verification failures from Tasks 3–29.
- Create: `documentation/biometric-login-verification.md`

**Interfaces:**
- Final repository state has exactly 30 feature commits, no weakened checks, and clean verification output for all affected CI lanes.

- [ ] Run targeted checks first: native-biometric unit tests, auth-provider/offline tests, WebAuthn tests, documentation validation, frontend lint/typecheck, backend typecheck, and native biometric Playwright.
- [ ] Run the complete local gate with bounded lanes: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run test:scripts`, `npm.cmd run test:documentation`, `npm.cmd run test:fast`, `npm.cmd run test:backend:integration`, `npm.cmd run test:contract`, `npm.cmd run build`, and `npm.cmd run test:e2e:critical`.
- [ ] Record the exact command names, exit codes, test counts, platform limitations, and remote-CI verification state in `documentation/biometric-login-verification.md`.
- [ ] Inspect `git diff --check`, `git status --short`, and `git log --oneline -30`; commit the verification record and any verified quality-gate fixes as `chore: verify biometric login quality gates`.

## Plan Self-Review

- Spec coverage: WebAuthn preservation is covered by Tasks 6, 21, and 28; native secure storage by Tasks 3, 6, 9, and 10–13; offline-first behavior by Tasks 14–18 and 26–27; UI by Tasks 19–23; cleanup by Task 24; documentation by Task 29; CI by Task 30.
- Placeholder scan: the plan contains no `TBD`, `TODO`, `FIXME`, “implement later”, or unspecified error-handling steps.
- Type consistency: the `NativeBiometricAdapter`, `NativeAuthRecord`, `NativeAuthVault`, and auth-context methods are named consistently across all tasks.
- Commit count: Task 1 is the existing spec commit; Task 2 is the plan commit; Tasks 3–30 are 28 implementation/documentation/verification commits, totaling exactly 30.
