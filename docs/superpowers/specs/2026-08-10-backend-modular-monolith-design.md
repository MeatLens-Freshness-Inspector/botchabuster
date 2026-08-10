# Backend Modular Monolith Design

**Goal:** Refactor the TypeScript backend into a secure, test-led modular monolith while preserving its HTTP API and making every observed Supabase access path bounded, projection-based, and index-supported for a target workload of 1,000–2,000 concurrent users.

## Constraints

- Do not add Redis, Grafana, queues, observability services, ORMs, or any other runtime dependency. Use Node.js, Express, TypeScript, Supabase, and already-installed packages only.
- `backend/supabase/` is immutable in place: existing migrations, functions, and policies are never edited. New, forward-only migrations are permitted.
- Preserve existing endpoint paths, request/response contracts, authentication modes, cookies, and CSRF behavior unless a security defect requires a compatible tightening.
- Preserve existing test files and their intent. Add focused regression and architecture tests alongside them; do not wholesale rewrite the test suite.
- Every production behavior change follows red-green-refactor. Every commit is independently typecheckable and has relevant tests passing.

## Recommended Approach: Incremental Strangler Migration

Three approaches were considered:

1. **Big-bang directory move.** Fast to start but breaks imports, obscures behavior changes, and produces poorly reviewable commits.
2. **Feature folders without layers.** Improves navigation but leaves controllers coupled to Supabase and does not make persistence performance testable.
3. **Incremental modular monolith with compatibility composition.** Move one bounded feature at a time behind explicit application and repository boundaries, retain public routes, and replace wiring only after its tests pass.

Approach 3 is selected. It creates useful commits, makes SQL-shaped access auditable, and avoids a flag day for the frontend.

## Target Layout

```text
backend/src/
  app.ts                       # only builds the Express application
  server.ts                    # only starts and stops HTTP
  bootstrap/
    dependencies.ts            # concrete adapters and use-case factories
    routes.ts                  # mounts module routers in one place
  config/
    env.ts                     # validated environment input
    app.config.ts              # typed application configuration
  shared/
    domain/                    # errors, IDs, shared value objects
    application/               # Result, pagination and request limits
    infrastructure/
      supabase/                # client factory and adapter error conversion
    presentation/
      http/                    # response helpers and error mapping
      middleware/              # auth, CSRF, security headers, rate limiting
  modules/
    auth/
    inspections/
    users/
    access-codes/
    audit/
    markets/
    chat/
    analytics/
    developer/
    analysis/
```

Each module contains only the layers it needs:

```text
modules/<name>/
  domain/          # entities, value objects, errors, repository ports
  application/     # command/query use cases and DTOs
  infrastructure/  # Supabase, storage, filesystem, and WebAuthn adapters
  presentation/
    routes/        # Express route definitions and middleware order
    controllers/   # HTTP request-to-use-case adapters
    schemas/       # allowlist parsing and input normalization
    views/         # stable JSON response serializers
  index.ts         # the only module-facing public surface
```

## MVC Inside Each Module

The modular-monolith boundaries do not replace MVC; they make it local to each feature.

- **Model:** domain entities, value objects, repository ports, application DTOs, and the Supabase repository implementation. Persistence details remain infrastructure, while the model defines the data and business invariants used by the module.
- **Controller:** `presentation/controllers` receives an Express request, invokes exactly one use case, and translates only expected application errors into HTTP status codes. Controllers never construct Supabase queries or decide database projections.
- **View:** `presentation/views` serializes a use-case result into the module's stable JSON response shape. This keeps frontend-facing fields and response compatibility out of controllers and repositories.
- **Routes:** `presentation/routes` defines endpoint paths and middleware order, then delegates to a controller. It contains no business logic.

The request flow is therefore `route → controller → use case/model → repository port → Supabase adapter → view`. Use cases own authorization decisions and orchestration. Repository ports express a query’s required projection, filter, ordering, and page size; Supabase implementations contain all PostgREST calls. No controller or use case imports the Supabase client.

## Module Boundaries

- **auth:** app sessions, Supabase authentication bridge, passkeys, CSRF bootstrap, session limits.
- **inspections:** inspection creation/idempotency, scoped reads, classification updates, protocol validation.
- **users:** profiles, roles, admin user lifecycle, privilege summary.
- **access-codes:** registration-code lifecycle and validation.
- **audit:** encryption, append-only event writes, paged audit reads.
- **markets:** market-location catalog.
- **chat:** contact eligibility, conversation history, message creation.
- **analytics:** landing-page statistics and bounded inspection metrics.
- **developer:** datasets, training artifacts, export/import validation.
- **analysis:** image analysis endpoint and image storage coordination.

Cross-module calls go through exported application ports, never through a module’s repository implementation. The composition root supplies concrete adapters.

## Persistence and Scaling Design

The Node backend currently uses Supabase/PostgREST rather than raw SQL. Optimizing it therefore means optimizing the generated query’s projection, predicates, ordering, row bounds, and supporting PostgreSQL index or function.

All repository queries will follow these rules:

- Select named columns only; `select("*")` is prohibited outside deliberately isolated internal row-mapping code.
- Clamp client-controlled limits and reject invalid cursors, UUIDs, dates, enum values, and sort keys before a database call.
- Use deterministic `created_at, id` ordering and cursor pagination for inspection and audit timelines. Offset pagination remains only where the existing frontend contract requires it and is hard-capped.
- Avoid loading full tables into Node for counts or groupings. New read-only Supabase functions aggregate inspection statistics, landing-page statistics, in-app metrics, and chat contact summaries in PostgreSQL.
- Use a transaction-safe, forward-only migration to add only indexes that directly match observed filters and orderings. Planned indexes include inspection timelines, active user sessions, passkeys by user/time, audit timeline, and chat participant/time access paths.
- Keep database calls parameterized through the Supabase client or typed RPC arguments. Stored functions use fixed `search_path`, fixed query text, and are granted only to `service_role`.
- Limit developer exports by both row count and cumulative image bytes; preserve the existing bounded download concurrency and add per-request abort/size protection.

The implementation will include a query inventory mapping every repository method to its index or database function. This makes the target credible, but capacity is verified rather than promised: actual 1,000–2,000-user throughput also depends on the selected Supabase plan, connection limits, row cardinality, and production network latency.

## Security Design

- Parse and allowlist every route parameter, query parameter, JSON body field, MIME type, storage path, URL, and ZIP manifest field at the presentation boundary.
- Keep cookie sessions, origin checks, CSRF tokens, secure cookie rules, WebAuthn verification, and the existing device-limit behavior.
- Move authentication and role gates to declarative route middleware while retaining a single request auth context per request.
- Use typed application errors so expected 4xx responses never leak internal error details; log sanitized 5xx diagnostics only.
- Enforce ownership or role authorization in use cases before a repository operation, even when an upstream route also applies middleware.
- Preserve rate limits with the existing in-process limiter. This deliberately remains process-local because external state stores are out of scope.

## Testing and Verification

- Existing unit, integration, infrastructure, and contract tests remain as compatibility contracts.
- Add unit tests for each newly extracted use case, parser, value object, and query adapter mapping.
- Add integration tests for route wiring, MVC request-to-view flow, authorization, CSRF, error mapping, and cursor/page limits.
- Add architecture tests that prevent `presentation` and `application` code from importing Supabase infrastructure directly.
- Add deterministic adapter tests that assert selected columns, filter values, range/cursor bounds, and error translation without a live database.
- Use a built-in Node load probe only against an explicitly configured non-production target; no load test runs against the developer’s database by default.

## Commit Plan

The implementation will be divided into approximately 75 coherent commits, not artificial file splits:

| Phase | Focus | Target commits |
| --- | --- | ---: |
| 1 | Baseline, shared errors/results, config, composition root | 8 |
| 2 | Query inventory, repository ports, additive Supabase performance migration | 12 |
| 3 | Auth, sessions, passkeys, request-auth and CSRF module | 12 |
| 4 | Inspections and analytics query/use-case migration | 12 |
| 5 | Users, access codes, markets, and audit module migration | 12 |
| 6 | Chat, analysis/storage, and developer module migration | 12 |
| 7 | Route cutover, architecture boundaries, load probe, cleanup | 7 |

Every phase is API-compatible and ends with backend typecheck plus relevant unit and integration tests. The final phase also runs the complete backend suite and root contract suite.
