# Backend Full Legacy Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor every remaining legacy backend route, controller, and service into modular-monolith MVC boundaries while preserving all existing API contracts and tests.

**Architecture:** Each bounded context owns `domain`, `application`, `infrastructure`, and `presentation` layers. Every endpoint follows route → controller → one-operation use case → domain port/repository → view. The existing `src/services` files remain only as thin compatibility facades for unchanged tests and imports; all business logic and Supabase access move into modules. The composition root creates concrete dependencies once and mounts only module routers.

**Tech Stack:** TypeScript 5, Node.js, Express 4, Supabase JS/Postgres, existing WebAuthn/Multer/Sharp/fflate/Nodemailer packages, and Node’s built-in test runner.

## Global Constraints

- Do not add Redis, Grafana, queues, ORMs, or runtime dependencies.
- Never edit existing files under `backend/supabase/`; only add forward-only migrations.
- Do not modify existing tests; add contract and unit tests alongside the refactor.
- Preserve every route URL, HTTP method, status code, response field, authorization rule, cookie behavior, and rate limit.
- Use one application use case per operation; no controller or service may coordinate unrelated operations.
- Keep MVC inside every module: route → controller → use case/model → repository → view.
- Prefer composition. A class marked `@final` must have a private constructor and static factory; inheritance is limited to genuine error/polymorphism contracts.
- Legacy compatibility files may delegate to modules, but may not import Supabase, contain SQL, own business rules, or coordinate multiple use cases.
- Every database read has an explicit projection, validated bounds, deterministic ordering, and an index/RPC rationale in `backend/docs/query-inventory.md`.
- Use `npm.cmd` in this Windows workspace because PowerShell blocks `npm.ps1`.

---

### Task 1: Establish full-migration guardrails

**Files:**
- Create: `backend/tests/architecture/no-legacy-business-logic.architecture.test.ts`
- Create: `backend/tests/architecture/module-use-case-shape.architecture.test.ts`
- Create: `backend/tests/architecture/route-registration.architecture.test.ts`
- Modify: `backend/package.json`

**Interfaces:**
- The legacy scanner reads `src/controllers`, `src/services`, and `src/routes` and rejects Supabase imports and direct database calls after migration.
- The use-case scanner requires each `modules/**/application/**/*.ts` class to expose one public `execute` method.
- The route scanner requires `src/app.ts` to import only `src/bootstrap/routes.ts` for API mounting.

- [ ] Write tests that initially report the current legacy imports and direct route registration as failures.
- [ ] Run `npm.cmd run test:architecture` and record the expected failures.
- [ ] Implement scanners with filesystem-only analysis and clear file/line diagnostics.
- [ ] Add `test:architecture` to the backend test command if needed.
- [ ] Run the guardrail suite and commit `test: enforce full legacy migration boundaries`.

### Task 2: Move shared presentation and bootstrap composition

**Files:**
- Create: `backend/src/bootstrap/dependencies.ts`
- Create: `backend/src/bootstrap/modules.ts`
- Create: `backend/src/bootstrap/routes.ts`
- Create: `backend/src/shared/presentation/middleware/auth.middleware.ts`
- Create: `backend/src/shared/presentation/middleware/error-handler.middleware.ts`
- Modify: `backend/src/app.ts`, `backend/src/middleware/auth.ts`, `backend/src/middleware/errorHandler.ts`
- Modify: `backend/src/server.ts`

**Interfaces:**
- `createDependencies(config): BackendDependencies` returns immutable composed adapters/use cases.
- `createModuleRouters(dependencies): Record<string, Router>` returns routers for all 13 API prefixes.
- `createAuthContextMiddleware(dependencies)` preserves `resolveTrackedRequestAuthContext` behavior.

- [ ] Add a bootstrap test asserting all route prefixes are returned by one composition root.
- [ ] Implement dependencies with constructor injection and no module-level service singletons.
- [ ] Move security/error middleware behind shared presentation exports while retaining old imports as delegates.
- [ ] Make `createApp` mount only `createModuleRouters` and preserve middleware ordering.
- [ ] Run app-factory, security, and architecture tests; commit `feat: add backend composition root`.

### Task 3: Complete auth module and reduce auth facades

**Files:**
- Create: `backend/src/modules/auth/application/use-cases/SignUpUser.ts`
- Create: `backend/src/modules/auth/application/use-cases/GetSession.ts`
- Create: `backend/src/modules/auth/application/use-cases/SignOutUser.ts`
- Create: `backend/src/modules/auth/application/use-cases/SendPasswordReset.ts`
- Create: `backend/src/modules/auth/application/use-cases/UpdateEmail.ts`
- Create: `backend/src/modules/auth/application/use-cases/UpdatePassword.ts`
- Create: `backend/src/modules/auth/application/use-cases/RecoverPassword.ts`
- Create: `backend/src/modules/auth/application/use-cases/BeginPasskeyRegistration.ts`
- Create: `backend/src/modules/auth/application/use-cases/VerifyPasskeyRegistration.ts`
- Create: `backend/src/modules/auth/application/use-cases/BeginPasskeyAuthentication.ts`
- Create: `backend/src/modules/auth/application/use-cases/VerifyPasskeyAuthentication.ts`
- Create: `backend/src/modules/auth/application/use-cases/ListPasskeys.ts`
- Create: `backend/src/modules/auth/application/use-cases/DeletePasskey.ts`
- Create: `backend/src/modules/auth/infrastructure/SupabaseAuthRepository.ts`
- Create: `backend/src/modules/auth/infrastructure/SupabasePasskeyRepository.ts`
- Create: `backend/src/modules/auth/presentation/controllers/AuthController.ts`
- Create: `backend/src/modules/auth/presentation/routes.ts`
- Create: `backend/src/modules/auth/presentation/views/AuthBootstrapView.ts`
- Modify: `backend/src/services/AuthService.ts`, `AppSessionService.ts`, `CsrfTokenService.ts`, `PasskeyService.ts`, `PasskeyCeremonyStore.ts`, `SessionLimitService.ts`
- Remove business logic from: `backend/src/controllers/AuthController.ts`, `backend/src/routes/auth.ts`

**Interfaces:**
- Auth repositories expose only credential, password, session, passkey, and session-limit operations.
- Each controller method calls one use case and one view; cookie/session mechanics are injected presenters.
- Compatibility service exports delegate to module ports so existing tests can still monkeypatch their public methods.

- [ ] Add failing unit tests for each use case and route-level tests for every existing auth URL.
- [ ] Move session-token signing, CSRF signing, passkey ceremony state, and DB session limits behind final OOP components.
- [ ] Implement one operation per application class and map all errors through `ApplicationError`.
- [ ] Cut `/api/auth` to the module router and preserve all cookie, CSRF, rate-limit, and audit behavior.
- [ ] Convert six legacy auth service files into delegation-only facades and delete the old auth controller implementation.
- [ ] Run all auth unit/integration/security tests; commit cohesive auth operation groups.

### Task 4: Complete users/profile module

**Files:**
- Create: `backend/src/modules/users/domain/ports/ProfileRepository.ts`
- Create: `backend/src/modules/users/domain/ports/IdentityAdminRepository.ts`
- Create: `backend/src/modules/users/application/use-cases/UpdateProfile.ts`
- Create: `backend/src/modules/users/application/use-cases/ListProfiles.ts`
- Create: `backend/src/modules/users/application/use-cases/GetUserStats.ts`
- Create: `backend/src/modules/users/application/use-cases/CheckUserRole.ts`
- Create: `backend/src/modules/users/application/use-cases/CreateAdminUser.ts`
- Create: `backend/src/modules/users/application/use-cases/UpdateAdminUser.ts`
- Create: `backend/src/modules/users/application/use-cases/DeleteAdminUser.ts`
- Create: `backend/src/modules/users/infrastructure/SupabaseProfileRepository.ts`
- Create: `backend/src/modules/users/infrastructure/SupabaseIdentityAdminRepository.ts`
- Create: `backend/src/modules/users/presentation/controllers/ProfileController.ts`
- Create: `backend/src/modules/users/presentation/routes.ts`
- Create: `backend/src/modules/users/presentation/views/ProfileView.ts`
- Modify: `backend/src/services/ProfileService.ts`, `backend/src/controllers/ProfileController.ts`, `backend/src/routes/profiles.ts`

**Interfaces:**
- Profile reads use explicit columns and bounded pagination.
- Admin identity listing uses a bounded page loop and never loads an unbounded auth-user collection.
- Role checks accept an allowlisted role value object.

- [ ] Add tests for update validation, role priority, admin CRUD authorization, pagination, and response compatibility.
- [ ] Move every profile/role operation into its own use case and repository method.
- [ ] Cut `/api/profiles` over and turn `ProfileService` into a delegation facade.
- [ ] Remove the old profile controller logic; run users/security/integration tests and commit.

### Task 5: Complete inspections module

**Files:**
- Create: `backend/src/modules/inspections/application/use-cases/ListInspections.ts`
- Create: `backend/src/modules/inspections/application/use-cases/CreateInspection.ts`
- Create: `backend/src/modules/inspections/application/use-cases/DeleteInspection.ts`
- Create: `backend/src/modules/inspections/application/use-cases/GetInspectionStatistics.ts`
- Create: `backend/src/modules/inspections/application/use-cases/UpdateManualClassification.ts`
- Create: `backend/src/modules/inspections/infrastructure/SupabaseInspectionRepository.ts`
- Create: `backend/src/modules/inspections/presentation/controllers/InspectionController.ts`
- Create: `backend/src/modules/inspections/presentation/routes.ts`
- Create: `backend/src/modules/inspections/presentation/views/InspectionListView.ts`
- Modify: `backend/src/services/InspectionService.ts`, `backend/src/controllers/InspectionController.ts`, `backend/src/routes/inspections.ts`
- Modify: `backend/docs/query-inventory.md`

**Interfaces:**
- List queries use `PageLimit`/`PageOffset` or cursor bounds and `(user_id, created_at DESC, id DESC)` ordering.
- Create preserves client-submission idempotency and audit events.
- Delete/classification updates enforce actor scope in the use case, not only in routing.

- [ ] Add failing tests for list bounds, create idempotency, scope authorization, delete, statistics, and manual classification.
- [ ] Move all persistence logic into the repository with named projections and duplicate-safe writes.
- [ ] Cut `/api/inspections` over and retain compatibility exports for existing tests.
- [ ] Remove legacy inspection controller/service business logic; run all inspection/developer/security suites and commit.

### Task 6: Complete analysis, upload, and storage modules

**Files:**
- Create: `backend/src/modules/analysis/domain/ports/InferenceGateway.ts`
- Create: `backend/src/modules/analysis/domain/ports/ImageStorage.ts`
- Create: `backend/src/modules/analysis/application/AnalyzeImage.ts`
- Create: `backend/src/modules/analysis/application/CheckAnalysisHealth.ts`
- Create: `backend/src/modules/analysis/application/UploadInspectionImage.ts`
- Create: `backend/src/modules/analysis/infrastructure/SupabaseImageStorage.ts`
- Create: `backend/src/modules/analysis/infrastructure/LegacyInferenceGateway.ts`
- Create: `backend/src/modules/analysis/presentation/controllers/AnalysisController.ts`
- Create: `backend/src/modules/analysis/presentation/controllers/UploadController.ts`
- Create: `backend/src/modules/analysis/presentation/routes.ts`
- Create: `backend/src/modules/analysis/presentation/views/AnalysisView.ts`
- Modify: `backend/src/controllers/AnalysisController.ts`, `UploadController.ts`, `backend/src/routes/analysis.ts`, `upload.ts`, `backend/src/services/StorageService.ts`

**Interfaces:**
- Upload ports enforce MIME, extension, byte-size, and path-scope allowlists before storage.
- Inference receives an immutable image command and returns a typed inspection result.
- Failed storage/inference workflows clean up staged files.

- [ ] Add tests for multipart validation, storage path traversal, image limits, inference mapping, health, and cleanup.
- [ ] Implement composed analysis/storage use cases and module MVC routes.
- [ ] Replace old controllers/service implementation with facades and run infrastructure/security tests.

### Task 7: Complete access-codes, markets, and audit modules

**Files:**
- Create: `backend/src/modules/access-codes/domain/Code.ts`, application use cases, repository, controllers, routes, views.
- Create: `backend/src/modules/markets/domain/MarketName.ts`, application use cases, repository, controllers, routes, views.
- Create: `backend/src/modules/audit/domain/AuditEvent.ts`, application use cases, crypto/repository adapters, controllers, routes, views.
- Modify: corresponding files under `src/controllers`, `src/routes`, and `src/services`.

**Interfaces:**
- Access-code writes normalize and validate code/description values before persistence.
- Market writes use conflict-safe names and admin authorization.
- Audit encryption remains AES-GCM with key-id/version metadata and append-only writes.

- [ ] Add failing tests for all CRUD operations, role gates, encrypted payload round trips, batch limits, and safe pagination.
- [ ] Implement each operation as one use case and move Supabase calls to repositories.
- [ ] Cut all three route families over and convert legacy services/controllers to facades.
- [ ] Run security and integration tests; commit each bounded context.

### Task 8: Complete chat module, including AI chat and conversations

**Files:**
- Create: `backend/src/modules/chat/application/use-cases/GetConversation.ts`
- Create: `backend/src/modules/chat/application/use-cases/SendMessage.ts`
- Create: `backend/src/modules/chat/application/use-cases/ChatWithAssistant.ts`
- Create: `backend/src/modules/chat/application/use-cases/CheckChatHealth.ts`
- Create: `backend/src/modules/chat/infrastructure/SupabaseUserChatRepository.ts`
- Create: `backend/src/modules/chat/infrastructure/SupabaseAssistantGateway.ts`
- Create: `backend/src/modules/chat/presentation/controllers/UserChatController.ts`
- Create: `backend/src/modules/chat/presentation/controllers/AssistantChatController.ts`
- Create: `backend/src/modules/chat/presentation/routes.ts`
- Modify: `backend/src/controllers/UserChatController.ts`, `ChatController.ts`, `backend/src/routes/userChat.ts`, `chat.ts`, `backend/src/services/UserChatService.ts`

**Interfaces:**
- Conversation queries validate UUIDs, enforce actor/counterparty eligibility, cap limits, and use deterministic participant ordering.
- Assistant chat keeps topic validation and edge-function calls behind a gateway.
- Contacts use the existing bounded RPC; no unbounded profile/message reads are reintroduced.

- [ ] Add tests for conversation authorization, limit bounds, send validation, assistant topic filtering, and route security/rate limiting.
- [ ] Implement repositories/gateways and one use case per operation.
- [ ] Cut `/api/chat` and `/api/user-chat` over; remove old controller/service logic and run chat integration tests.

### Task 9: Complete developer module

**Files:**
- Create: `backend/src/modules/developer/application/use-cases/GetOverview.ts`
- Create: `ListDatasets.ts`, `UpdateManualClassification.ts`, `ExportDataset.ts`, `ListTrainingRuns.ts`, `ImportTrainingRun.ts`
- Create: `backend/src/modules/developer/infrastructure/SupabaseDeveloperRepository.ts`
- Create: `backend/src/modules/developer/infrastructure/TrainingArtifactStorage.ts`
- Create: `backend/src/modules/developer/presentation/controllers/DeveloperDashboardController.ts`
- Create: `backend/src/modules/developer/presentation/controllers/DeveloperOptionsController.ts`
- Create: `backend/src/modules/developer/presentation/routes.ts`
- Create: `backend/src/modules/developer/presentation/views/DeveloperView.ts`
- Modify: developer controllers/routes/services/storage/types.

**Interfaces:**
- Dataset filters parse to bounded DTOs; exports cap rows, image count, image bytes, concurrency, and response size.
- ZIP paths are normalized and confined to a staging directory; manifests are validated before import.
- Developer options tokens use a final signer/verifier component and never expose secrets.

- [ ] Add tests for every existing developer endpoint, filter, export/import failure, ZIP traversal, and role gate.
- [ ] Move all developer dashboard/storage logic into module use cases and adapters.
- [ ] Cut both developer route families over and remove legacy business logic.

### Task 10: Finish analytics and remaining read models

**Files:**
- Create: `backend/src/modules/analytics/application/GetModelMetrics.ts`
- Create: `backend/src/modules/analytics/application/GetUserStatistics.ts`
- Create: `backend/src/modules/analytics/presentation/controllers/InspectionStatisticsController.ts`
- Create: `backend/src/modules/analytics/presentation/controllers/ModelMetricsController.ts`
- Modify: `backend/src/routes/stats.ts`, `backend/src/routes/inspections.ts`, `backend/src/routes/profiles.ts`, analytics repository/migrations/query inventory.

**Interfaces:**
- All aggregate reads call fixed RPCs or bounded indexed projections; no count-plus-full-table fallback remains.
- Views preserve all existing response keys and zero-result behavior.

- [ ] Add tests for every stats endpoint and RPC error/empty response.
- [ ] Cut remaining aggregate routes to analytics controllers and update query inventory.
- [ ] Run query-shape and analytics integration tests.

### Task 11: Remove legacy route/controller logic and complete compatibility facades

**Files:**
- Modify: every `backend/src/routes/*.ts` to re-export module routers or remove after bootstrap cutover.
- Modify: every `backend/src/controllers/*.ts` to remove implementation or delete when no imports remain.
- Modify: every `backend/src/services/*.ts` to delegation-only compatibility facades for tests/importers.
- Modify: `backend/src/app.ts`, `backend/src/bootstrap/routes.ts`, and module `index.ts` files.

**Interfaces:**
- `src/app.ts` has no endpoint-specific controller/service imports.
- Legacy service facades contain no Supabase imports, SQL, business branching, or private helper orchestration.
- No module imports another module’s infrastructure or presentation layer.

- [ ] Add an import-graph test proving every API route resolves to a module router.
- [ ] Delete old controller implementations and route-local singleton construction.
- [ ] Replace service classes with thin compatibility objects that delegate to composed module dependencies.
- [ ] Run the full unit/integration/architecture suite after each bounded deletion group.

### Task 12: Full verification, query inventory, and cleanup

**Files:**
- Modify: `backend/docs/query-inventory.md`
- Create: `backend/tests/architecture/no-god-classes.architecture.test.ts`
- Create: `backend/tests/architecture/query-boundary.architecture.test.ts`
- Create: `backend/tests/contract/full-route-surface.contract.test.ts` if the existing contract suite lacks coverage.
- Remove: only superseded compatibility code proven unreachable by import graph/tests.

**Interfaces:**
- No module application/controller class exceeds one operation responsibility.
- Every Supabase call is in an infrastructure adapter and appears in the query inventory with projection/bounds/index or RPC rationale.
- Full route contract test enumerates every URL/method from the old router surface.

- [ ] Run `rg` checks for Supabase imports and direct database access outside infrastructure.
- [ ] Run `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd test`, and the root contract suite.
- [ ] Run the architecture scanners and confirm zero god-class, route-bypass, and query-boundary violations.
- [ ] Review `git status`, leave `backend/planned-architecture.md` untouched, and commit the final cleanup.

## Completion Gate

The refactor is complete only when every old route is mounted from a module presentation router, every old controller is removed or is a delegation-only compatibility facade, every old service contains no business logic or Supabase access, all route contracts and existing tests pass, no architecture scanner reports god classes or boundary violations, and the query inventory covers every persistence operation.
