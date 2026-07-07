# Cross-Site Cookie Auth With 24h Offline Re-Login Design

Date: 2026-07-07
Status: Approved for implementation

## Summary

Replace the current frontend-stored bearer-token model with cross-site cookie-based auth for the Netlify frontend and Render backend, while preserving offline re-login for up to 24 hours after the last successful online sign-in. Online auth uses `HttpOnly` secure cookies over HTTPS. Offline re-login uses local verifier-style artifacts only and never restores a live backend credential into browser storage.

## Goals

- Remove live auth tokens from frontend-accessible storage.
- Use standard browser security for transport and session handling.
- Keep the required Netlify frontend and Render backend deployment model.
- Preserve offline re-login after full browser restart for exactly 24 hours after `authenticatedAt`, the last successful online sign-in or online passkey authentication.
- Allow offline re-login with either password or local passkey.
- Keep existing offline caches and queues working.
- Avoid any new database schema changes for this auth hardening work.

## Non-Goals

- Adding custom AES-wrapped request and response payloads on top of HTTPS.
- Replacing Supabase as the identity provider.
- Changing the existing `user_sessions` table schema.
- Removing offline inspection/history caching.
- Extending offline access beyond 24 hours without a fresh online sign-in.
- Making offline unlock equivalent to a live backend-authenticated session.

## Recommended Approach

The approved approach is:

- Transport security via HTTPS/TLS only.
- Browser session auth via backend-issued `HttpOnly` cookies.
- Cross-site credentialed requests from Netlify to Render.
- CSRF protection for cookie-authenticated mutating requests.
- A separate offline auth envelope stored locally for offline re-login.
- No live access token, refresh token, or CSRF token persisted in frontend durable storage.

This is preferred over full application-layer request encryption because it is the industry-standard design for browser apps, works cleanly with cross-site deployments, and does not break multipart uploads or streaming chat.

## Existing System Context

The current system behaves like this:

- Frontend API clients call the backend with `fetch`.
- The frontend auth cache stores user/session/profile/admin state in Web Storage.
- Protected backend routes read `Authorization: Bearer ...`.
- The backend already has an app-session service and a `user_sessions` table used for concurrent-session limits.
- IndexedDB already stores offline-capable caches and queues such as inspection history and pending offline sync work.

Relevant existing areas:

- `frontend/src/lib/authCache.ts`
- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/lib/offlineCredentials.ts`
- `frontend/src/lib/passkeys/localUnlock.ts`
- `frontend/src/lib/inspectionHistoryCache.ts`
- `frontend/src/lib/offlineQueue.ts`
- `frontend/src/lib/offlineAuditQueue.ts`
- `backend/src/services/AuthService.ts`
- `backend/src/services/AppSessionService.ts`
- `backend/src/services/SessionLimitService.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/config/cors.ts`
- `backend/src/server.ts`

## Approved Product Rules

The following rules were explicitly approved during design:

- Netlify frontend plus Render backend is required.
- No new DB migrations are required for this change.
- Online auth must use secure cookies instead of frontend-stored bearer tokens.
- Offline re-login must work after full browser restart.
- Offline re-login is valid for exactly 24 hours after the last successful online sign-in.
- Successful offline unlock must not extend that 24-hour window.
- Offline re-login may use either password-based local verification or local passkey unlock.
- Passwords remain on the standard server-hashed path and are not replaced by custom frontend encryption.

## Architecture Overview

The auth model splits into two separate concerns:

1. Online browser session
2. Offline local unlock

### Online Browser Session

- Backend issues an app session cookie after successful online sign-in.
- Cookie is the only browser credential used for backend API access.
- Frontend never reads the cookie value directly.
- Backend middleware authenticates requests from the cookie rather than from a bearer header.

### Offline Local Unlock

- After successful online sign-in, the frontend stores a local offline auth envelope.
- That envelope contains local verifier-style data and minimal cached identity/profile state.
- The envelope is valid only until `lastOnlineSignIn + 24h`.
- Offline unlock restores local app access only; it does not mint a new backend session.

## Cross-Site Cookie And CSRF Model

Because the frontend and backend are hosted on different origins, the backend session must use a cross-site cookie design.

### Session Cookie

The backend should issue a cookie with:

- `HttpOnly`
- `Secure`
- `SameSite=None`
- `Path=/`
- `Max-Age=APP_SESSION_TTL_SECONDS`
- matching `Expires`

The cookie should remain scoped to the backend host unless a broader domain scope is truly necessary.

Cookie lifetime rules:

- the cookie is persistent across browser restart until its configured TTL expires
- the cookie TTL is independent from the 24-hour offline unlock window
- the cookie is issued on successful online sign-in and successful online passkey authentication
- session bootstrap does not rotate or extend the cookie in the current design

### Credentialed Requests

Frontend API requests must use:

- `credentials: "include"`

Backend CORS must:

- allow only configured Netlify origins
- return the exact matched origin rather than `*`
- set `Access-Control-Allow-Credentials: true`
- allow relevant headers including `Content-Type` and `X-CSRF-Token`

### CSRF Protection

Because cookies are automatically sent by the browser, authenticated mutating requests need CSRF protection.

Approved model:

- validate `Origin` for all non-`GET`/`HEAD`/`OPTIONS` requests
- require `X-CSRF-Token` on authenticated mutating endpoints
- keep the CSRF token in frontend memory only
- issue a fresh CSRF token during sign-in and session bootstrap
- do not store CSRF tokens in durable frontend storage

This model works for:

- JSON API requests
- multipart uploads
- chat POST requests that return streaming responses

## Request And Session Flow

### Online Sign-In

- User signs in online with email/password or online passkey.
- Backend verifies credentials with Supabase.
- Backend sets the app session cookie.
- Backend sets `authenticatedAt` in the app session token payload.
- Backend returns:
  - user snapshot
  - minimal profile/admin state needed to render the app
  - in-memory CSRF token
  - `authenticatedAt`
  - `offlineExpiresAt`

The backend must not return live access or refresh tokens to the browser.

### Session Bootstrap

On app startup while online:

- Frontend calls a session/bootstrap endpoint with `credentials: "include"`.
- If the cookie is valid, backend returns:
  - authenticated user snapshot
  - profile/admin data
  - fresh CSRF token
  - relevant session metadata
  - `authenticatedAt`
  - `offlineExpiresAt`
- Frontend enters `online-authenticated`.
- Frontend refreshes the offline auth envelope from the bootstrap payload.

Source-of-truth rule for offline expiry:

- `offlineExpiresAt` is always computed as `authenticatedAt + 24h`
- `authenticatedAt` means the timestamp of the last successful online sign-in or successful online passkey authentication
- session bootstrap must preserve that existing `authenticatedAt`; it does not create a new one and does not extend the 24-hour offline window
- the backend source of truth is the signed app session cookie payload
- the frontend stores the mirrored value inside the offline auth envelope for offline-only startup and unlock decisions

### Offline Startup

On app startup while offline:

- Frontend loads the offline auth envelope from IndexedDB.
- If there is no valid envelope, the app cannot re-login offline.
- If there is a valid envelope, the app enters `offline-locked` and prompts for password or local passkey.

### Offline Unlock

If offline unlock succeeds and the envelope is not expired:

- Frontend enters `offline-authenticated`.
- Frontend restores cached profile/admin state from the offline envelope.
- Only offline-capable features are enabled.

Offline unlock does not:

- create a new backend session
- refresh the cookie
- extend the 24-hour window

### Reconnect

When connectivity returns:

- Frontend checks the live session through the bootstrap/session endpoint.
- If the cookie session is valid, state upgrades to `online-authenticated` and queued sync can resume.
- If the cookie session is missing or expired, online-only actions stay blocked until a fresh online sign-in succeeds.

## Frontend State Model

The frontend auth context should model explicit states instead of inferring auth from cached session objects.

Approved states:

- `anonymous`
- `bootstrapping`
- `online-authenticated`
- `offline-locked`
- `offline-authenticated`
- `expired`

This avoids stale cached state making the app appear fully signed in when the backend session is gone.

## Frontend Storage Model

### Durable Offline Auth Envelope

The offline auth envelope should be stored in IndexedDB, not in `localStorage` or `sessionStorage`.

Recommended contents:

- `userId`
- `email`
- minimal profile snapshot
- `isAdmin`
- `authenticatedAt`
- `offlineExpiresAt`
- password verifier metadata when password-based offline unlock has been provisioned
- local passkey metadata when local passkey offline unlock has been enrolled
- local UX flags needed for offline unlock

This is a single ownership boundary:

- password-based offline verifier data belongs inside the offline auth envelope
- local passkey offline-unlock metadata belongs inside the offline auth envelope
- migration should consolidate current separate durable auth-adjacent stores into this one IndexedDB-owned unit for offline auth

### Data That Must Not Be Stored Durably

Do not store:

- backend session cookies
- bearer access tokens
- refresh tokens
- durable CSRF tokens

### Existing Offline Stores

Existing IndexedDB-backed offline stores remain in place for:

- inspection history cache
- pending inspection sync queue
- pending audit sync queue

Those stores are separate from the new offline auth envelope.

## Backend Endpoints And Contracts

### `POST /api/auth/sign-in`

Request remains email/password JSON.

Success behavior:

- verify credentials
- set session cookie
- return:
  - `user`
  - `profile`
  - `isAdmin`
  - `csrfToken`
  - `authenticatedAt`
  - `offlineExpiresAt`

Do not return live access or refresh tokens.

### `POST /api/auth/passkeys/authenticate/verify`

Success behavior mirrors sign-in:

- verify passkey response
- set session cookie
- return the same bootstrap payload plus `csrfToken`

### `GET /api/auth/session`

Purpose:

- bootstrap current online session from cookie

Success return:

- `user`
- `profile`
- `isAdmin`
- `csrfToken`
- session metadata useful to the UI
- `authenticatedAt`
- `offlineExpiresAt`

### `POST /api/auth/sign-out`

Behavior:

- require valid cookie auth
- require CSRF
- clear the session cookie
- return `204`

Frontend sign-out rule:

- explicit user sign-out is local-first
- frontend clears in-memory auth state and clears the offline auth envelope immediately, even if the backend request fails or cannot be sent
- if online and a valid cookie session exists, frontend then attempts backend sign-out best-effort to clear the cookie server-side
- if CSRF is required for this backend request, the frontend snapshots the current in-memory CSRF token before clearing local state and uses that snapshot for the best-effort sign-out call

### Public Auth Routes

These remain public:

- `POST /api/auth/sign-up`
- `POST /api/auth/reset-password`
- `POST /api/auth/passkeys/authenticate/options`

They should keep:

- rate limiting
- strict allowed-origin enforcement

### Recovery Password Route

The recovery-password flow should no longer depend on a frontend-stored bearer token.

Recommended behavior:

- frontend receives the recovery artifact from the auth redirect flow
- frontend submits it to backend once
- backend verifies it with the existing auth integration and updates the password

### Authenticated Auth-Surface Routes

The following existing authenticated auth routes are in scope for the cookie and CSRF model:

- `POST /api/auth/passkeys/register/options`
- `POST /api/auth/passkeys/register/verify`
- `GET /api/auth/passkeys`
- `DELETE /api/auth/passkeys/:credentialId`
- `PATCH /api/auth/users/:id/email`
- `PATCH /api/auth/users/:id/password`

Contract rule for these routes:

- cookie auth replaces bearer-header auth
- mutating requests require CSRF
- read-only authenticated requests require cookie auth but not CSRF

Route intent:

- passkey register options and verify use the live cookie session because they bind a passkey to the signed-in user
- passkey list and delete use the live cookie session because they manage enrolled credentials
- email and password update routes use the live cookie session and CSRF because they mutate account state

## Backend Service And Middleware Design

### Auth Service

- Keep Supabase as the online identity source.
- Keep server-side password hashing behavior unchanged.
- Stop returning live browser-readable session tokens.
- Continue integrating with `SessionLimitService` for concurrent-device enforcement.

### App Session Service

- Continue using a signed server-issued app session token if desired.
- Deliver it only through a cookie.
- Validate it from the cookie in auth middleware.
- Include both:
  - session-expiry fields for online cookie validation
  - `authenticatedAt` for strict offline-window derivation

### Session Limit Integration

The existing `user_sessions`-based concurrent-session limit remains part of the auth flow.

Approved behavior:

- after successful online sign-in or successful online passkey authentication, the backend registers the issued app session token with `SessionLimitService`
- the stored hash continues to represent the app session token, even though the browser only receives it through an `HttpOnly` cookie
- sign-out with a valid cookie removes the corresponding `user_sessions` entry
- explicit sign-out while offline or after cookie loss cannot immediately remove the backend row and therefore relies on normal session expiry plus existing prune-on-auth cleanup

Concurrent-session rule:

- device-limit enforcement continues to track active backend session lifetime, not whether the frontend is currently in a locally locked state

### CSRF Token Service

- Add a server-side CSRF service with stateless verification.
- Token should be derivable from server secret plus session identity and expiry metadata.
- No CSRF persistence table is needed.

### Auth Middleware

- Primary auth path becomes cookie-based.
- Attach resolved auth context to the request.
- Mutating protected routes also validate CSRF.

## Offline Capability And Route Gating

Offline-authenticated mode is intentionally limited.

### Allowed Offline

These remain available when offline and locally unlocked:

- offline inspection flow using the existing offline analysis pipeline
- capture and queue new inspections for later sync
- view cached inspection history and cached local summaries
- view cached profile basics needed for local navigation
- local passkey unlock flows
- offline audit queueing

### Blocked Or Degraded Offline

These require a live backend session and stay unavailable offline:

- AI chat assistant
- user-to-user chat
- profile edits that require backend persistence
- password and email updates
- access-code management
- admin data that depends on fresh server state
- any route or action that needs live backend truth

### Route Policy

Routes should be classified as:

- `public`
- `offline-capable`
- `online-only`

This avoids hidden failures where a route renders but key actions inside it cannot actually work.

## Sign-Out And Lock Policy

Sign-out and temporary lock are different concepts.

### Explicit User Sign-Out

Recommended behavior:

- clear in-memory auth state
- clear offline unlock artifacts
- attempt backend cookie clearing when possible

This makes explicit sign-out a true revocation of local re-entry.

If the user signs out while offline or after the cookie already expired:

- frontend still clears local offline auth artifacts immediately
- backend sign-out may be skipped or may fail harmlessly
- the user must perform a fresh online sign-in later to restore offline capability

### Inactivity Lock

Recommended behavior:

- clear in-memory auth state
- preserve offline unlock artifacts
- require offline unlock again if still within the 24-hour window

This keeps the current usability intent while still enforcing re-authentication locally.

## Migration And Rollout Plan

Rollout should be staged.

### Stage 1: Backend Compatibility

- Add cookie issuance and validation.
- Add CSRF issuance and validation.
- Add session bootstrap endpoint.
- Temporarily keep legacy bearer-header auth compatibility while the frontend transitions.

### Stage 2: Frontend Switch

- Update frontend requests to use `credentials: "include"`.
- Stop using stored bearer/session tokens for online requests.
- Bootstrap from `/api/auth/session`.
- Introduce the IndexedDB offline auth envelope.

### Stage 3: One-Time Local Migration

On first run after upgrade:

- read existing cached user/profile/admin state
- read offline credential and local passkey data
- write the new single offline auth envelope to IndexedDB
- clear old auth/session keys from `localStorage` and `sessionStorage`

Do not migrate any live access token into durable storage.

Migration cleanup rule:

- after a successful migration, legacy auth-adjacent durable stores that were absorbed into the envelope should be cleared
- if migration fails, do not partially keep both the new envelope and legacy auth stores active at the same time

### Stage 4: Remove Legacy Frontend Bearer Flow

- Remove frontend assumptions about bearer-token auth.
- Keep backend compatibility only as long as needed for deployment safety.

### Stage 5: Tighten Backend

After frontend rollout is stable:

- remove browser-facing bearer fallback if no longer needed
- enforce CSRF consistently on protected mutating routes
- keep credentialed CORS behavior strict

## Error Handling And Failure Modes

### Invalid Or Missing Online Session

If session bootstrap returns `401`:

- treat the online session as invalid immediately
- transition to:
  - `offline-locked` if a valid offline envelope exists
  - `expired` or `anonymous` otherwise

Do not keep protected online state alive merely because stale local state exists.

### CSRF Failures

If a mutating request fails CSRF validation:

- do not blindly retry
- if online, refresh the session/bootstrap once to obtain a fresh in-memory CSRF token
- retry only if session bootstrap succeeds
- otherwise require re-authentication

### Offline Envelope Failures

If the offline auth envelope is:

- missing
- malformed
- expired
- inconsistent with verifier or passkey data

then:

- clear the broken offline auth envelope
- clear any companion legacy auth stores that were supposed to be retired by migration
- preserve unrelated offline queues and cached inspection data
- require a fresh online sign-in for future offline re-login capability

### Migration Failures

If migration to the new offline envelope fails:

- clear legacy live auth artifacts rather than leaving mixed old/new auth state
- do not leave a half-populated offline auth envelope active
- preserve offline inspection and audit queues
- require a fresh online sign-in instead of guessing

## Auth State Event Matrix

### Successful Online Sign-In

- backend sets cookie and returns bootstrap payload
- frontend enters `online-authenticated`
- frontend writes a new offline auth envelope
- `authenticatedAt` becomes the new source of truth for `offlineExpiresAt`

### Page Reload While Online

- frontend calls session bootstrap
- if cookie valid, frontend restores `online-authenticated`
- bootstrap returns the existing `authenticatedAt`
- offline window is preserved, not extended

### Browser Restart While Online

- if the persistent cookie is still within TTL, bootstrap restores `online-authenticated`
- if the cookie expired but offline envelope is still valid, app enters `offline-locked`
- if both are unavailable or expired, app enters `expired` or `anonymous`

### Offline Unlock

- frontend validates password or local passkey against the offline auth envelope
- if valid and not expired, frontend enters `offline-authenticated`
- offline window is not extended

### Explicit Sign-Out

- frontend clears in-memory auth state and offline auth envelope immediately
- backend cookie clearing is attempted best-effort if reachable

### Inactivity Lock

- frontend clears in-memory auth state only
- offline auth envelope remains if still within the 24-hour window

### Cookie Expired

- bootstrap or protected online request fails auth
- app falls back to `offline-locked` if the offline envelope is still valid
- otherwise app transitions to `expired` or `anonymous`

### CSRF Failure

- protected mutating request fails
- frontend may perform one online bootstrap refresh attempt
- if still invalid, app requires re-authentication for online actions

### Migration Failure

- app does not trust partial migrated auth state
- offline queues remain
- user may need a fresh online sign-in to recreate a clean offline envelope

### Network Ambiguity

If the device is technically online but the backend is unreachable:

- do not assume the cookie session is usable
- stay in the nearest safe local state
- only resume queued network sync after successful session bootstrap

## Testing Strategy

### Backend Coverage

Add or update backend coverage for:

- sign-in sets the session cookie with the expected attributes
- session bootstrap succeeds with valid cookie auth and fails without it
- protected routes accept cookie auth
- protected mutating routes reject missing or invalid CSRF
- disallowed origins are rejected
- sign-out clears the cookie
- cookie-backed `SessionLimitService` registration, enforcement, and cleanup paths remain correct

If temporary legacy bearer compatibility is kept, test it separately and remove that coverage when the compatibility layer is removed.

### Frontend Coverage

Add or update frontend coverage for:

- app bootstrap uses the session endpoint instead of reading live token auth
- auth state transitions across online and offline modes
- offline re-login works after browser restart when the envelope is valid
- offline re-login fails after the strict 24-hour deadline
- password-based offline unlock works
- local passkey offline unlock works
- migration clears legacy auth/session storage keys after success

### Integration And End-To-End Checks

Cover these flows:

- online sign-in, reload, authenticated app still works
- browser restart while offline, re-login works within 24 hours
- browser restart while offline after 24 hours, re-login is blocked
- offline inspection capture queues correctly
- reconnect resumes sync only when a valid online session is restored
- upload and chat work online with cookie auth and CSRF
- online-only features are disabled in offline-authenticated mode

### Manual Verification

Before calling the implementation complete, verify:

- no live auth token remains in `localStorage`, `sessionStorage`, or IndexedDB
- session cookie is `HttpOnly`, `Secure`, and `SameSite=None`
- Netlify requests to Render use `credentials: "include"`
- CSRF header is present on protected mutating requests
- offline unlock remains strict and is not extended by offline activity

## Files Expected To Change

Likely backend areas:

- `backend/src/server.ts`
- `backend/src/config/cors.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/controllers/AuthController.ts`
- `backend/src/services/AuthService.ts`
- `backend/src/services/AppSessionService.ts`
- new CSRF service and possibly new auth/session helper modules

Likely frontend areas:

- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/lib/authCache.ts`
- `frontend/src/lib/offlineCredentials.ts`
- `frontend/src/lib/passkeys/localUnlock.ts`
- frontend API clients under `frontend/src/integrations/api/`
- new IndexedDB-backed offline auth envelope helper(s)
- route guards and offline-capability gating logic

Likely test areas:

- backend auth and CORS tests
- frontend auth-context and bootstrap tests
- Playwright or equivalent end-to-end auth/offline flow coverage

## Implementation Notes

- Keep the auth hardening focused on session handling, CSRF, and offline unlock separation.
- Prefer the smallest coherent refactor that fully removes browser-stored live auth tokens.
- Reuse existing IndexedDB patterns for the offline auth envelope rather than inventing a separate durable-storage approach.
- Preserve current offline inspection and queue behavior wherever possible.
- Avoid pseudo-online states where the UI appears fully authenticated even though the backend session is invalid or missing.
