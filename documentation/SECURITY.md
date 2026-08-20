# Backend security guide

## Secrets and trust boundaries

Required backend secrets are configured only on the server:

- `SUPABASE_SERVICE_KEY` — privileged database/storage operations; never expose it to the browser.
- `SUPABASE_PUBLISHABLE_KEY` — publishable Supabase auth key used for public auth calls.
- `APP_SESSION_SECRET` — signs application sessions and is required at startup.
- `AUDIT_LOG_KEY` — 32-byte AES-256-GCM key represented as 64 hex characters or base64.
- `CSRF_TOKEN_SECRET` — CSRF signing key; defaults to the application-session secret when omitted, but a separate value is recommended.

Use different values for development and production. Do not commit `.env` files, service keys, session secrets, SMTP passwords, or developer unlock passwords.

## Authentication and sessions

- Supabase Auth handles credential and passkey verification.
- The backend issues a signed `meatlens_session` token for cookie-capable clients.
- Cookies are `HttpOnly`, use `Secure` when configured/production, and use a safe SameSite policy.
- Bearer authentication remains available for native clients.
- Session tokens are hashed before device-limit tracking; raw tokens are not stored in the database.
- Every accepted app-session request refreshes its server-side `last_seen_at` timestamp.
- The backend periodically deletes idle or absolutely expired session rows; missing or stale rows are rejected and never re-registered by ordinary requests.
- `SESSION_IDLE_TIMEOUT_SECONDS` and `SESSION_CLEANUP_INTERVAL_SECONDS` both default to 900 seconds. Cleanup has a 300-second minimum and is not shortened to match the idle timeout; delayed row deletion never extends authorization or the JWT's absolute expiry.
- Session expiry and the configured device limit are enforced before protected controllers run.

## CSRF and origins

For cookie-authenticated unsafe requests, the client must send both:

```http
Origin: https://approved-frontend.example
X-CSRF-Token: <token>
```

`ALLOWED_ORIGINS` is a comma-separated allowlist and supports `*` wildcard patterns. Requests without an `Origin` header (for example health checks) are allowed. Bearer-only requests do not use the cookie CSRF transport.

## Authorization

Role context is resolved by the users module. The application distinguishes inspector, admin, and developer roles. Developer routes require developer access; developers may satisfy admin checks for shared administrative data. Self-service routes compare the authenticated user ID with the target route parameter.

## Input and resource controls

- JSON and multipart payloads are bounded.
- Upload destinations and file names are controlled by backend middleware.
- IDs, pagination, cursor, classification, organization, and decision fields are validated before use.
- Database calls use Supabase parameter binding and explicit projections.
- Reads are bounded, ordered deterministically, and scoped by user/role.

## Realtime chat boundary

- Browsers authenticate `GET /api/user-chat/events` with the existing HttpOnly cookie or native bearer transport; tokens never appear in stream URLs.
- The stream validates `Origin` explicitly before committing SSE headers and rotates at the earlier of absolute app-token expiry or one idle-timeout window.
- The Supabase service key and Realtime channel remain backend-only. Insert events are delivered only when the server-authenticated user is the sender or recipient.
- One backend instance accepts at most 100 streams and two per user, bounds each response queue to 100 events or 256 KiB, and stops reconnecting after 1, 2, 5, 15, and 30-second retries.
- Authenticated message sends are limited to 30 per user per minute. Heartbeat comments do not perform authentication, touch session activity, or call Supabase.

## Headers and error responses

The app applies `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cross-Origin-Opener-Policy`, and `Origin-Agent-Cluster`. The global error handler returns stable operational errors and hides unexpected internal details.

## Verification

Security-sensitive changes must include or update tests under `backend/tests/unit`, `backend/tests/integration`, or `backend/tests/architecture`. Run:

```bash
npm run test -w backend
npm run typecheck -w backend
```
