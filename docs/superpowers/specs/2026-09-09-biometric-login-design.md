# Biometric Login Design

**Date:** 2026-09-09

**Status:** Approved for planning

## Goal

Allow MeatLens users to authenticate with device biometrics through two complementary paths: the existing WebAuthn/passkey flow for online sign-in, and a native Capacitor biometric vault for restoring a previously authenticated session and unlocking offline-first functionality.

## Scope

This feature includes:

- hardening and completing the existing WebAuthn platform-authenticator flow;
- a Capacitor-only native biometric login action for Android and iOS;
- secure storage of the native session credential and a protected offline bootstrap copy;
- offline biometric unlock that restores the existing offline-authenticated mode;
- online session restoration when the native credential is still valid;
- profile enrollment and disable controls;
- accessible login/profile UI states and actionable error handling;
- unit, integration, architecture, and Playwright coverage;
- documentation and CI verification.

This feature does not send biometric data to MeatLens, create a second backend identity system, or remove password and passkey fallbacks.

## Existing Context

The repository already contains:

- server-side WebAuthn registration and authentication using `@simplewebauthn/server`;
- frontend WebAuthn browser helpers using `@simplewebauthn/browser`-compatible browser APIs;
- passkey enrollment, sign-in, removal, and offline local-passkey unlock flows;
- browser IndexedDB and native SQLite offline-auth envelope storage;
- online and offline auth modes in `AuthProvider`;
- Capacitor Android and iOS projects;
- CI lanes for lint, typecheck, frontend/backend tests, build, contract tests, and Playwright.

The implementation must extend these boundaries rather than introduce a parallel auth provider.

## Architecture

### WebAuthn passkeys

The existing WebAuthn path remains the primary online biometric path. The server creates a one-time authentication challenge, the platform authenticator performs user verification, and the server verifies the assertion before issuing the existing MeatLens application session. Existing challenge expiry, origin checks, RP ID checks, counter updates, rate limits, audit events, and passkey credential management remain required.

### Native biometric vault

The native path is a Capacitor-only device-unlock capability. It proves that the user passed the device biometric or configured device credential; it does not send biometric material to JavaScript or the backend.

The frontend owns a project-level adapter with a stable interface for:

- checking native availability and enrollment;
- enrolling a native auth record;
- unlocking the record;
- updating the record after a successful online bootstrap;
- clearing the record.

The adapter hides the selected Capacitor biometric and secure-storage package APIs. Secure storage uses platform Keychain/Keystore-backed storage. The implementation must not expose vendor plugin calls to `AuthProvider` or page components.

### Native record contents

The native record contains only the minimum data needed to restore MeatLens state:

- the authenticated user ID;
- the current MeatLens application session credential, when available;
- the serialized offline bootstrap envelope;
- a record version and authenticated timestamp;
- an integrity-protected expiration timestamp.

Biometric templates, raw biometric results, passwords, Supabase service credentials, and private server keys are never stored in the record.

The native vault stores the protected copy. Native SQLite may retain the existing offline envelope for password/local-passkey fallback, while the biometric copy is encrypted and only released after native authentication. The protected copy must be invalidated on disable, sign-out, account switch, account removal, or vault corruption.

## Data flow

### Enrollment

1. The user is online and `online-authenticated`.
2. Profile checks native biometric availability.
3. The user explicitly selects **Enable biometric login**.
4. The native prompt authenticates the user.
5. The adapter stores the current session credential and protected offline bootstrap copy.
6. The UI reports enabled state only after storage succeeds.

Enrollment is never implicit during password or passkey sign-in.

### Native login

1. The login page detects native availability and an enrolled vault.
2. The user selects **Sign in with device biometrics**.
3. The adapter prompts for biometrics/device credentials and releases the native record.
4. If online and the stored session credential is valid, the app restores `online-authenticated` state and refreshes the bootstrap data.
5. If offline, or if the credential cannot be refreshed but the offline record is valid, the app restores `offline-authenticated` state.
6. If the offline expiry has passed, the app refuses local unlock and requires a fresh online password or WebAuthn sign-in.

### Reconnect

When an offline-authenticated native session regains connectivity, the existing reconnect behavior attempts to restore the online session. A valid protected session credential upgrades the state to `online-authenticated`; an invalid or expired credential leaves the user in the existing safe offline state and does not bypass password/passkey login requirements.

## Offline-first behavior

Native biometrics add an unlock factor to the existing offline system. They do not alter the existing offline capabilities or expiry policy.

After successful offline biometric unlock, the app remains `offline-authenticated` with no live API session. Existing local inspection analysis, cached history, pending uploads, queued audit logs, and supported offline messaging behavior continue to operate. Existing synchronization resumes after reconnect.

Password unlock and local WebAuthn passkey unlock remain available as fallback mechanisms. A biometric prompt cannot extend the offline expiry or authorize server-only operations without a valid online session.

## User experience

### Login page

- **Sign in with Passkey** remains available when WebAuthn platform authentication is supported.
- **Sign in with Device Biometrics** appears only on native platforms with an enrolled native vault.
- **Unlock with Device Biometrics** is shown when the app is offline-locked and a native vault is enrolled.
- Password and existing local-passkey fallback actions remain available.

### Profile page

Add a separate native biometric section with:

- availability messaging;
- **Enable biometric login**;
- enabled status;
- **Disable biometric login**;
- a short explanation that biometric data stays on the device.

WebAuthn passkey management remains a separate section because passkeys are portable WebAuthn credentials while native biometric login is a local vault unlock.

### Error handling

Normalize native errors into user-safe categories:

- unavailable or not enrolled: use password/passkey;
- cancelled: return to the login page without treating it as a server failure;
- lockout or too many failures: use device fallback, password, or passkey;
- invalid/corrupt vault: clear the vault and require fresh online authentication;
- expired offline session: reconnect and sign in online.

## Security requirements

- No biometric data or raw native credential result enters the backend.
- No password or service key is written to native secure storage.
- Native session material is never persisted in browser localStorage.
- Native vault reads require an explicit native authentication step.
- Vault records are scoped to the current MeatLens app and current user ID.
- Sign-out clears the active session, offline envelope, and native vault, matching existing behavior.
- Lock preserves the offline envelope and native enrollment for quick unlock.
- Account switching, profile removal, disable, and vault corruption clear native material.
- Existing WebAuthn origin, RP ID, challenge, user-verification, counter, rate-limit, and audit requirements remain unchanged.

## Testing strategy

### Frontend unit tests

Cover capability detection, adapter behavior, native error normalization, vault serialization/versioning, enrollment, unlock, disable, expiry, session restoration, reconnect upgrade, login hook states, profile controls, and sign-out cleanup.

### Backend tests

Keep all current passkey service, ceremony, route, session, security, and integration tests. Add or update contract coverage only where the native flow changes shared auth bootstrap/session behavior. Native biometric verification itself is intentionally not a backend concern.

### End-to-end tests

Retain the existing WebAuthn login and management journey. Add mocked Capacitor/native-vault journeys for:

- native enrollment;
- online biometric login;
- offline biometric unlock;
- expired offline record;
- cancelled/locked-out prompt;
- disable and sign-out cleanup;
- password/passkey fallback.

### CI gates

For affected commits, run the smallest complete relevant lane first, then the full relevant local CI set before completion: lint, typecheck, frontend unit/component/integration/architecture tests, backend unit/architecture/integration tests, contract tests, build, documentation validation, and critical Playwright coverage. No existing gate may be weakened or skipped.

## Commit strategy

The implementation will target exactly 30 coherent commits:

1. approved biometric-login design specification;
2. implementation plan;
3. native dependency manifest update;
4. native capability adapter contract;
5. browser-safe adapter fallback;
6. native availability detection;
7. normalized biometric error model;
8. native vault record schema;
9. secure-storage adapter;
10. vault enrollment API;
11. vault unlock API;
12. vault update API;
13. vault clear and invalidation API;
14. native offline-envelope protection;
15. online credential restoration;
16. offline biometric restoration;
17. reconnect upgrade handling;
18. auth-provider state integration;
19. native biometric login hook actions;
20. login-page native capability state;
21. login-page biometric action UI;
22. profile enrollment UI;
23. profile disable and status UI;
24. sign-out/account-switch cleanup;
25. frontend adapter and vault unit tests;
26. auth-provider and offline integration tests;
27. Playwright native login journeys;
28. WebAuthn regression and security coverage;
29. documentation and platform setup guidance;
30. final CI verification and quality-gate fixes.

Each commit must be logically reviewable, must not contain unrelated dirty-worktree files, and must leave the repository in a testable state where practical.

## Platform verification limits

The repository is being modified from Windows, so Android source/build verification can be run locally where the toolchain is available. iOS source changes will be type-checked through the JavaScript/Capacitor integration and documented for macOS/Xcode verification if a local Xcode runner is unavailable. CI status must be reported precisely rather than inferred.
