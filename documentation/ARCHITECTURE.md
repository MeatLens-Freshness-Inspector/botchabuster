# MeatLens architecture

## System boundary

```text
React/Vite/Capacitor client
          │ HTTPS + credentialed cookie or bearer token
          ▼
Express app (backend/src/app.ts)
          │ security headers → origin check → CORS → JSON parser
          ▼
Bootstrap route registry
          │
          ├── auth
          ├── users
          ├── inspections
          ├── analysis / upload
          ├── access-codes
          ├── analytics
          ├── markets
          ├── audit
          ├── chat / user-chat
          └── developer / developer-options
          │
          ▼
Application use cases → domain ports → infrastructure adapters
          │
          ▼
Supabase PostgreSQL/Auth/Storage and SMTP (when configured)
```

No Redis, Grafana, message broker, or external observability platform is required.

## Modular monolith

Each bounded context has a public `index.ts` composition surface and four layers:

| Layer | Responsibility | Allowed dependencies |
| --- | --- | --- |
| Presentation | Express routers, controllers, views, HTTP validation | application, shared, middleware |
| Application | One-operation use cases and orchestration | domain ports, shared |
| Domain | Value objects, policies, repository/gateway ports | shared domain primitives |
| Infrastructure | Supabase, Storage, SMTP, encryption, concrete adapters | domain/application contracts, integrations |

Presentation and application code never imports Supabase directly. Database access stays in infrastructure and uses parameterized calls with explicit projections.

## MVC request flow

```text
Request
  ↓
module presentation route
  ↓
controller (HTTP parsing, auth context, status mapping)
  ↓
application use case (`execute`)
  ↓
module infrastructure adapter
  ↓
Supabase / Storage / SMTP
  ↓
view or shared HTTP response
```

The old top-level `src/routes`, `src/controllers`, `src/services`, and `src/models` layers have been removed. New code must be placed in the owning module or in an explicitly shared cross-cutting layer.

## Module responsibilities

- **Auth:** password flows, passkeys, app sessions, CSRF tokens, device limits, email, and cookie policy.
- **Users:** profiles, roles, admin user operations, and user statistics.
- **Inspections:** scoped CRUD, inspection identifiers, statistics, and manual classifications.
- **Analysis:** multipart image handling and storage/analysis use cases.
- **Access codes:** validation, creation, deletion, and activation toggles.
- **Analytics:** landing-page and inspection aggregate queries.
- **Markets:** market-location CRUD.
- **Audit:** encrypted audit-log writes and reads.
- **Chat:** assistant chat plus bounded user-chat contacts/conversations.
- **Developer:** dataset exports, classification updates, training-run imports, and unlock-token policy.

## Cross-cutting middleware

- `auth.ts` resolves app-session cookies or bearer tokens, enforces CSRF/origin checks for unsafe cookie requests, and attaches role context.
- `securityHeaders.ts` applies baseline browser security headers.
- `rateLimit.ts` provides bounded in-process rate limits for public auth and chat endpoints.
- `upload.ts` and `developerPackageUpload.ts` constrain multipart fields, file sizes, and temporary upload locations.
- `errorHandler.ts` serializes malformed JSON, operational errors, and safe internal-error responses.

## Authentication model

1. Supabase Auth verifies credentials or passkey assertions.
2. The backend issues a signed `meatlens_session` application token for cookie-capable clients.
3. Cookie requests include a CSRF token on unsafe methods and must pass origin validation.
4. Native/bearer clients may send `Authorization: Bearer ...`.
5. The session-limit component tracks active device slots using hashed tokens; expired slots are pruned.
6. Role resolution occurs through the users module. Developers are treated as administrators for admin data access and receive developer-only routes separately.

## Persistence and scale

Persistence components use:

- explicit column lists instead of `select('*')` or empty projections;
- bounded `limit`/range reads and deterministic `order` clauses;
- indexes for user, timestamp, role, session, passkey, audit, and chat lookups;
- aggregate RPCs for landing, classification, model, and chat-contact metrics;
- user/role scoping before data is returned.

This keeps the backend stateless apart from Supabase and bounded in-process controls, supporting the project’s 1,000–2,000 simultaneous-user target without Redis or a queue.

## Testing architecture

```text
backend/tests/unit          # value objects, use cases, adapters, security policies
backend/tests/integration   # Express routes and auth/security flows
backend/tests/architecture  # boundaries, route composition, query shape, final classes
```

Run `npm run test -w backend` before changing module boundaries or persistence queries.
