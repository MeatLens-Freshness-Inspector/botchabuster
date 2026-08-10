# Backend Modular Monolith Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Express/Supabase backend into a modular, MVC-preserving, object-oriented monolith with secure, bounded persistence access and no god classes.

**Architecture:** Use an incremental strangler migration. Existing endpoint contracts remain stable while modules gain domain, application, infrastructure, and MVC presentation boundaries. The composition root wires concrete adapters; modules expose only `index.ts` contracts.

**Tech Stack:** TypeScript 5, Node.js, Express 4, Supabase JS, existing WebAuthn/Multer/Sharp/fflate/Nodemailer packages, Node’s built-in test runner.

## Global Constraints

- Do not add Redis, Grafana, queues, ORMs, or runtime dependencies.
- Never edit existing files under `backend/supabase/`; only add forward-only migrations.
- Preserve existing tests and API contracts; add tests for every moved behavior.
- Use red-green-refactor for production behavior.
- Keep MVC inside every module: route → controller → use case/model → repository → view.
- No god classes: one use case per operation, narrow adapters, composition by default.
- Final classes use private constructors and named factories; inheritance is limited to genuine polymorphic contracts.
- Every database query uses named projections, validated bounds, deterministic ordering, and an index or RPC rationale.
- Use `npm.cmd` in this Windows workspace because PowerShell blocks `npm.ps1`.

---

## Work Package 1: Baseline and Architecture Guardrails (commits 1–5)

**Files:** Create `backend/tests/architecture/import-boundaries.architecture.test.ts`, `backend/tests/architecture/final-classes.architecture.test.ts`, `backend/tests/architecture/module-exports.architecture.test.ts`; modify only test configuration if required.

- [ ] Write failing import-boundary tests that reject `@supabase/supabase-js` imports from `modules/*/presentation` and `modules/*/application`.
- [ ] Run `npm.cmd run test:unit`; confirm the tests fail because the target module tree is not present.
- [ ] Add the minimal architecture scanner using TypeScript’s compiler API and filesystem traversal.
- [ ] Add final-class and module-export guard tests with one known-good fixture.
- [ ] Commit each guardrail independently with `test: add module architecture guardrails` messages; run the architecture tests after each commit.

## Work Package 2: Shared Domain and Application Kernel (commits 6–10)

**Files:** Create `backend/src/shared/domain/errors/ApplicationError.ts`, `NotFoundError.ts`, `ValidationError.ts`, `AuthorizationError.ts`; `backend/src/shared/application/Result.ts`, `pagination.ts`, `requestLimits.ts`; tests under `backend/tests/unit/shared/`.

- [ ] Write failing tests for typed error status mapping, `Result.ok/fail`, and clamped page limits.
- [ ] Implement final `PageLimit`, `PageOffset`, and `Cursor` value objects with private constructors and static factories.
- [ ] Implement the application error hierarchy and JSON-safe public messages.
- [ ] Implement `Result<T,E>` and cursor/page helpers without external packages.
- [ ] Commit each cohesive kernel slice separately; run its unit tests and backend typecheck after every commit.

## Work Package 3: Shared Infrastructure and Configuration (commits 11–15)

**Files:** Create `backend/src/config/env.ts`, `app.config.ts`; `backend/src/shared/infrastructure/supabase/client.ts`, `errors.ts`; `backend/src/shared/presentation/http/response.ts`, `errorHandler.ts`; move behavior from `src/config`, `integrations`, and `middleware/errorHandler.ts` through compatibility exports.

- [ ] Write failing tests for validated environment parsing, separate service/publishable keys, and safe error serialization.
- [ ] Implement typed configuration as a composed object; keep existing `Config.getInstance()` as a compatibility facade.
- [ ] Implement a Supabase client factory and adapter error translator; repositories receive clients through constructors.
- [ ] Implement MVC response serializers and move the global error handler behind the shared presentation boundary.
- [ ] Commit config, client, error, and compatibility slices independently; run unit, integration, and typecheck commands.

## Work Package 4: Forward-Only Database Performance Migration (commits 16–20)

**Files:** Create `backend/supabase/migrations/20260810090000_backend_query_support.sql`, `backend/docs/query-inventory.md`, and adapter contract tests under `backend/tests/unit/shared/infrastructure/`.

- [ ] Write failing adapter-shape tests documenting projection, predicates, ordering, and bounds for inspections, sessions, passkeys, audit, and chat.
- [ ] Add only new indexes for `(user_id, created_at DESC, id DESC)` inspection reads, active session pruning/counts, passkeys by user/time, audit timeline, and chat participant/time access.
- [ ] Add service-role-only, fixed-search-path RPCs for landing stats, inspection classification stats, in-app metrics, and chat contact summaries; preserve existing functions.
- [ ] Add a query inventory mapping every repository method to its index/RPC and explain why no unbounded table read remains.
- [ ] Commit migration, inventory, and adapter contract slices separately; run SQL syntax checks available locally and all backend tests.

## Work Package 5: Auth Module and OOP Session Components (commits 21–25)

**Files:** Create `backend/src/modules/auth/{domain,application,infrastructure,presentation}/...`; migrate `AuthService`, `AppSessionService`, `CsrfTokenService`, `PasskeyService`, `PasskeyCeremonyStore`, and `SessionLimitService` behind ports.

- [ ] Write failing tests for final session-token value objects, auth commands, session-limit repository calls, and CSRF error mapping.
- [ ] Extract final `AppSessionToken`, `SessionId`, and `CsrfToken` classes with private constructors/factories.
- [ ] Extract single-operation use cases for sign-in, sign-up, sign-out, password recovery, passkey registration/authentication, and session tracking.
- [ ] Implement Supabase auth, session, and passkey adapters with named projections and composite-index predicates.
- [ ] Add MVC auth routes/controllers/views and compatibility exports; commit each operation family separately with auth unit/integration tests.

## Work Package 6: Users Module (commits 26–30)

**Files:** Create `backend/src/modules/users/...`; migrate `ProfileService`, role types, and `ProfileController`.

- [ ] Write failing tests for profile DTO parsing, role priority, final user/profile IDs, and admin authorization.
- [ ] Extract profile read/update, privilege summary, admin create/update/delete, and role-check use cases one operation per file.
- [ ] Implement profile and role repositories with named columns; page admin auth-user listing with a bounded loop.
- [ ] Implement users MVC routes/controllers/views and preserve existing URL contracts.
- [ ] Commit each operation family separately; run profile/role unit and integration tests plus typecheck.

## Work Package 7: Inspections Module (commits 31–35)

**Files:** Create `backend/src/modules/inspections/...`; move inspection entities, coordinate/pre-scan value objects, `InspectionService`, and `InspectionController`.

- [ ] Write failing tests for final inspection IDs, validated create commands, idempotent client submissions, and cursor pagination.
- [ ] Extract create, list, get-by-id, delete, manual-classification update, and developer-dataset query use cases.
- [ ] Implement inspection repositories with exact projections, composite timeline ordering, bounded filters, and duplicate-safe writes.
- [ ] Implement inspection MVC routes/controllers/views, retaining audit-event orchestration through an audit port.
- [ ] Commit each operation family separately; run all inspection unit/integration/contract tests after each slice.

## Work Package 8: Analytics Module (commits 36–40)

**Files:** Create `backend/src/modules/analytics/...`; migrate `StatsService`, inspection metrics, and `StatsController`.

- [ ] Write failing tests for landing-stat and classification-stat DTOs, bounded RPC mapping, and safe zero-result behavior.
- [ ] Implement analytics repository methods that call the new fixed RPCs instead of loading classifications into Node.
- [ ] Extract landing stats, inspection stats, and in-app model metrics into separate query use cases.
- [ ] Implement analytics MVC routes/controllers/views and preserve response field names.
- [ ] Commit each query/use-case slice separately; run analytics and integration tests with mocked RPC adapters.

## Work Package 9: Access Codes, Markets, and Audit Modules (commits 41–45)

**Files:** Create `backend/src/modules/access-codes/...`, `markets/...`, `audit/...`; migrate corresponding services/controllers/routes.

- [ ] Write failing tests for code normalization/validation, market-name value objects, audit payload encryption, and role gates.
- [ ] Extract one use case per access-code and market operation; add repository projections and conflict mapping.
- [ ] Extract audit write, batch write, and paged read use cases; keep AES-GCM and append-only semantics behind final crypto helpers.
- [ ] Implement MVC routes/controllers/views and route-level authorization while preserving controller fallback checks.
- [ ] Commit each module and the audit query slice independently; run security and module integration tests.

## Work Package 10: Chat Module (commits 46–50)

**Files:** Create `backend/src/modules/chat/...`; migrate `UserChatService` and `UserChatController`.

- [ ] Write failing tests for contact eligibility, UUID/content validation, conversation cursor bounds, and sender/recipient ownership.
- [ ] Extract actor-role, contact-list, conversation, and send-message use cases.
- [ ] Implement the chat repository using participant/time predicates and the new contact-summary RPC; never load all profiles/messages unnecessarily.
- [ ] Implement chat MVC routes/controllers/views and declarative auth/rate-limit middleware.
- [ ] Commit each operation family separately; run chat unit/integration tests and query-shape assertions.

## Work Package 11: Developer Module (commits 51–55)

**Files:** Create `backend/src/modules/developer/...`; migrate dashboard services/controllers/storage and dataset types.

- [ ] Write failing tests for dataset filter parsing, bounded exports, safe ZIP paths, manifest validation, and image byte limits.
- [ ] Extract overview, dataset page, manual classification, export, training-run list, and import use cases.
- [ ] Implement inspection read-model and storage adapters with explicit limits, abortable downloads, and bounded concurrency.
- [ ] Implement developer MVC routes/controllers/views and role middleware.
- [ ] Commit each operation family separately; run developer unit/integration tests and a bounded export smoke test.

## Work Package 12: Analysis and Storage Modules (commits 56–60)

**Files:** Create `backend/src/modules/analysis/...`; migrate `AnalysisController`, `StorageService`, upload middleware, and image-processing coordination.

- [ ] Write failing tests for multipart field validation, MIME/extension allowlists, path safety, image size limits, and analysis result views.
- [ ] Extract image-analysis and upload use cases with storage and model ports.
- [ ] Implement storage adapters with scoped paths, named content types, and cleanup on failed workflows.
- [ ] Implement analysis MVC routes/controllers/views and keep health checks isolated from business classes.
- [ ] Commit validation, storage, analysis, and route slices separately; run infrastructure and integration tests.

## Work Package 13: Bootstrap and Route Cutover (commits 61–65)

**Files:** Create `backend/src/bootstrap/dependencies.ts`, `routes.ts`, module indexes; modify `src/app.ts`, `src/server.ts`, and compatibility route files.

- [ ] Write failing tests asserting one composition root, one auth context per request, and complete route registration.
- [ ] Implement dependency factories that compose concrete OOP adapters and use cases without global service locators.
- [ ] Implement bootstrap route mounting and module public surfaces.
- [ ] Cut each legacy route over to its module router while preserving endpoint contracts.
- [ ] Commit bootstrap and route cutovers in bounded groups; run the full backend suite after every group.

## Work Package 14: Security Hardening and Architecture Enforcement (commits 66–70)

**Files:** Modify shared middleware and module schemas; create security/architecture tests under `backend/tests/integration/security/` and `backend/tests/architecture/`.

- [ ] Write failing tests for body-size limits, origin/CORS behavior, CSRF, secure cookies, rate limits, and safe 5xx responses.
- [ ] Centralize schema parsing, authorization context, error mapping, and security headers in shared presentation middleware.
- [ ] Add ZIP expansion and external-image response-size/time limits without new dependencies.
- [ ] Enforce module import boundaries, final-class markers, no controller Supabase imports, and no god-class thresholds.
- [ ] Commit each security boundary independently; run all security/integration/architecture tests.

## Work Package 15: Verification, Performance Probe, and Cleanup (commits 71–75)

**Files:** Create `backend/scripts/query-load-probe.ts`, `backend/docs/query-inventory.md` updates, and final architecture/contract tests; remove only superseded compatibility implementations after coverage is green.

- [ ] Write failing tests for the built-in load probe’s target allowlist, concurrency cap, timeout, and summary output.
- [ ] Implement a Node-only probe that requires an explicit non-production base URL and measures bounded endpoint latency; it never runs by default.
- [ ] Run backend typecheck, unit, integration, infrastructure, and root contract suites; fix regressions test-first.
- [ ] Remove dead legacy files only after import-graph and coverage checks prove no route depends on them.
- [ ] Commit final cleanup and verification separately; record exact test counts, query inventory, and known capacity assumptions.

## Completion Gate

The work is complete only when all 75 commits are present, no existing migration was edited, no disallowed dependency was added, all backend and contract tests pass, architecture tests report no boundary violations or god classes, and the final query inventory covers every Supabase/PostgREST call.
