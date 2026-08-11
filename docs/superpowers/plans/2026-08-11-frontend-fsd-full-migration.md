# Frontend FSD Full Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Replace the frontend's legacy route/component architecture with Feature-Sliced Design while preserving every visible behavior and producing at least 140 qualifying implementation commits.

**Architecture:** The application is rebuilt in place around app, pages, widgets, features, entities, and shared layers. Every move updates its active consumers in the same commit; route URLs, rendering, API behavior, offline data, and Capacitor behavior are preserved. The final tree contains no legacy root architecture or compatibility layer.

**Tech Stack:** React 18, TypeScript, Vite, React Router 6, TanStack Query 5, Tailwind/Radix UI, Capacitor 8, SQLite, ONNX Runtime Web, Node test runner with tsx, Playwright, ESLint.

## Global Constraints

- Preserve every route URL, redirect, guard, permission rule, rendered experience, interaction, request/response contract, native integration, and test-observable behavior.
- Do not change UI/UX, visual styling, copy, backend code, API contracts, or product scope.
- Use formal FSD layers: app, pages, widgets, features, entities, and shared. Imports flow only downward and external consumers use a slice's public index.ts API.
- Do not retain a legacy root layer, compatibility re-export, legacy path alias, or parallel architecture. Move a bounded source unit and its changed consumers in one commit.
- Keep React components, hooks, route composition, and simple transformations functional. Use classes only for narrow, stateful infrastructure or domain services where encapsulation materially helps.
- At 450 non-blank lines, split a file along a responsibility boundary before adding behavior. No maintained production source file may exceed 600 non-blank lines.
- Produce at least 140 qualifying migration commits. Each changes at least two non-empty files, is independently meaningful and testable, and is not empty, single-file, merge-only, lockfile-only, formatting-only, or count padding.
- The documentation commits for this design and plan do not count toward the qualifying migration-commit floor.

---

## Commit protocol

Every numbered ledger entry below is one required qualifying commit. Before committing:

- [ ] RED: write the smallest focused failing test before changing production code. For a behavior change, test the desired behavior; for a relocation, write a characterization or public-import contract test; for an architecture/configuration change, write the failing boundary or configuration fixture test.
- [ ] Verify RED: run the new test alone and confirm it fails for the expected missing behavior, missing public API, or forbidden dependency—not because of a typo, broken setup, or incorrect test.
- [ ] GREEN: implement the smallest production change needed to pass the failing test. Do not add unrelated cleanup or speculative abstractions.
- [ ] Verify GREEN: rerun the focused test, then run the named validation profile and confirm the relevant test or check succeeds with no failures.
- [ ] REFACTOR: only after green, split responsibilities, remove duplication, or improve names. Rerun the focused test and validation profile after refactoring.
- [ ] Run git diff --check and verify that the staged commit has at least two non-empty files.
- [ ] Stage only the files in that ledger entry and commit with its exact Conventional Commit title.
- [ ] Record the RED command/output, GREEN command/output, resulting commit SHA, and phase count in the execution log. A commit without recorded red-green evidence does not qualify toward the 144-commit floor.

The implementation must never introduce production code first and add tests afterward. Existing passing tests are not evidence of RED; every new test must be observed failing before its production change is written. Pure file moves still require a failing import-contract or characterization test before the move. Configuration and generated-code exceptions are limited to files that cannot contain maintained runtime behavior; configuration that affects runtime behavior receives a failing fixture test first.

Validation profiles:

~~~text
F = npm run typecheck -w frontend && npm run lint -w frontend && npm run test:unit -w frontend
I = F && npm run test:integration -w frontend
B = F && npm run build -w frontend
P-inspect = B && npm run test:e2e -w frontend -- tests/e2e/journeys/inspector/inspect-page.e2e.spec.ts
P-admin = B && npm run test:e2e -w frontend -- tests/e2e/journeys/administrator/admin-dashboard.e2e.spec.ts
P-offline = B && npm run test:e2e -w frontend -- tests/e2e/offline/offline-analysis.e2e.spec.ts
~~~

Use this public-slice pattern for every new slice:

~~~ts
// entities/inspection/index.ts
export type { Inspection, InspectionStatus } from "./model/types";
export { inspectionKeys } from "./model/keys";
export { inspectionClient } from "./api/inspection-client";
~~~

Do not deep-import a segment from another slice:

~~~ts
// Allowed
import { inspectionClient } from "@/entities/inspection";

// Forbidden outside entities/inspection
import { inspectionClient } from "@/entities/inspection/api/inspection-client";
~~~

## Target file structure

~~~text
frontend/src/
  app/{config,layouts,providers,router,styles}
  pages/{public,auth,inspector,admin}
  widgets/{navigation,inspection-workspace,history,profile,messages,admin-dashboard,assistant}
  features/{auth,passkeys,inspection-capture,inspection-submission,offline-sync,profile-editing,
            messaging,onboarding,tutorials,reports,admin-management,developer-tools}
  entities/{user,inspection,message,audit-log,access-code,market-location,developer-metrics}
  shared/{api,config,hooks,lib,platform,ui,assets}
~~~

The Vite technical entry remains frontend/src/main.tsx and imports only the app public API. It is not a legacy ownership folder.

## Phase 1 — Foundation and enforceable boundaries (18 commits)

**Files:** Create frontend/scripts/check-fsd-boundaries.mjs and frontend/scripts/check-source-size.mjs; modify frontend/package.json, frontend/eslint.config.js, frontend/tsconfig.app.json, root package.json; create app and shared layer roots.

**Interfaces:** Produces the @/app, @/shared, and public-slice import conventions; produces two executable checks that can run in report mode during migration and mandatory mode after the final cleanup.

- [ ] **Commit 001 — test: add FSD boundary checker**
  - Change: frontend/scripts/check-fsd-boundaries.mjs + frontend/scripts/check-fsd-boundaries.test.mjs.
  - Validate: node --test frontend/scripts/check-fsd-boundaries.test.mjs.

- [x] **Commit 002 — test: add frontend source-size checker**
  - Change: frontend/scripts/check-source-size.mjs + frontend/scripts/check-source-size.test.mjs.
  - Validate: node --test frontend/scripts/check-source-size.test.mjs.

- [x] **Commit 003 — build: register FSD validation commands**
  - Change: frontend/package.json + package.json.
  - Add report-mode and enforcement-mode commands; do not yet make known oversized legacy files a CI exception.
  - Validate: npm run test:scripts.

- [x] **Commit 004 — chore: configure FSD import restrictions**
  - Change: frontend/eslint.config.js + frontend/tests/unit/architecture/foundation-boundaries.unit.test.ts.
  - Reject forbidden upward-layer and cross-slice deep imports; the test covers valid public imports and rejected deep imports.
  - Validate: F.

- [x] **Commit 005 — refactor: introduce app configuration ownership**
  - Change: frontend/src/app/config/query-client.ts + frontend/src/App.tsx + frontend/tests/unit/app/query-client.unit.test.ts.
  - Move Query Client defaults from frontend/src/App.tsx without changing stale time, garbage-collection time, or online retry behavior. Generic environment access belongs to shared configuration because lower FSD layers cannot depend on app.
  - Validate: F.

- [x] **Commit 006 — refactor: move API base URL into shared transport**
  - Change: frontend/src/integrations/api/apiBaseUrl.ts -> frontend/src/shared/api/base-url.ts + frontend/src/shared/config/env.ts + frontend/tests/unit/utilities/api-base-url.unit.test.ts.
  - Move the API base URL and its environment read into shared ownership while preserving native and web URL behavior. Update every active consumer in the same commit; do not retain a legacy forwarding module.
  - Validate: F.

- [x] **Commit 007 — refactor: move request initialization into shared transport**
  - Change: frontend/src/integrations/api/apiRequest.ts -> frontend/src/shared/api/request.ts + frontend/tests/unit/utilities/api-request-timeouts.unit.test.ts.
  - Preserve AUTH_EXPIRED_EVENT, CSRF, session refresh, and HttpApiError behavior exactly. Update every active consumer in the same commit; do not retain a legacy forwarding module.
  - Validate: F.

- [x] **Commit 008 — refactor: move timeout fetch transport into shared**
  - Change: frontend/src/integrations/api/fetchWithTimeout.ts -> frontend/src/shared/api/fetch-with-timeout.ts + frontend/src/shared/api/index.ts.
  - Update every active timeout consumer to the shared API public surface; do not retain a legacy forwarding module.
  - Validate: F.

- [x] **Commit 009 — refactor: establish shared API error public API**
  - Change: frontend/src/shared/api/api-error.ts + frontend/src/shared/api/index.ts.
  - Move error-status and response-message helpers from request.ts without changing error messages, then update active consumers to the shared API public surface.
  - Validate: F.

- [x] **Commit 010 — refactor: migrate generic utility functions**
  - Change: frontend/src/lib/utils.ts -> frontend/src/shared/lib/utils.ts + frontend/src/lib/confidenceLevel.ts -> frontend/src/shared/lib/confidence-level.ts.
  - Update all active imports in the same commit; do not retain legacy forwarding modules.
  - Validate: F.

- [x] **Commit 011 — refactor: migrate shared date and storage helpers**
  - Change: frontend/src/lib/reports/formatting.ts -> frontend/src/shared/lib/date-time.ts + frontend/src/shared/lib/storage.ts.
  - The originally mapped generic date.ts and storage.ts files do not exist in this checkout. Move the actual reusable report date formatting behavior and extract the duplicated defensive JSON storage helpers from auth and developer-option persistence; update every active date-format consumer without a legacy forwarding module.
  - Validate: F.

- [x] **Commit 012 — refactor: migrate generic viewport hooks**
  - Change: frontend/src/hooks/use-desktop.tsx -> frontend/src/shared/hooks/use-desktop.ts + frontend/src/hooks/use-mobile.tsx -> frontend/src/shared/hooks/use-mobile.ts.
  - Preserve exported hook behavior, update every active consumer without legacy forwarding modules, and update frontend/tests/unit/hooks/use-desktop.unit.test.tsx.
  - Validate: F.

- [x] **Commit 013 — refactor: move core shared UI primitives**
  - Change: frontend/src/components/ui/button.tsx -> frontend/src/shared/ui/button.tsx + frontend/src/components/ui/input.tsx -> frontend/src/shared/ui/input.tsx.
  - Update all import consumers through frontend/src/shared/ui/index.ts.
  - Validate: F.

- [x] **Commit 014 — refactor: move dialog and form UI primitives**
  - Change: frontend/src/components/ui/dialog.tsx -> frontend/src/shared/ui/dialog.tsx + frontend/src/components/ui/form.tsx -> frontend/src/shared/ui/form.tsx + frontend/src/components/ui/label.tsx -> frontend/src/shared/ui/label.tsx.
  - Keep the lightweight shared/ui barrel free of the browser-sensitive dialog module; use shared/ui/dialog.tsx as its dedicated public entry and shared/ui/form.tsx/shared/ui/label.tsx as the form public entries.
  - Validate: F.

- [x] **Commit 015 — refactor: decompose shared sidebar primitive**
  - Change: frontend/src/components/ui/sidebar.tsx -> frontend/src/shared/ui/sidebar/sidebar-provider.tsx + frontend/src/shared/ui/sidebar/sidebar-layout.tsx + frontend/src/shared/ui/sidebar/sidebar-menu.tsx; move the sidebar’s generic separator, sheet, skeleton, and tooltip dependencies into shared UI public modules in the same commit.
  - Keep the public Sidebar exports stable through frontend/src/shared/ui/sidebar/index.ts; the resulting maintained files must each be below 450 non-blank lines.
  - Validate: F.

- [x] **Commit 016 — refactor: migrate remaining maintained shared UI**
  - Change: frontend/src/components/ui/sonner.tsx -> frontend/src/shared/ui/sonner.tsx + frontend/src/components/ui/toaster.tsx -> frontend/src/shared/ui/toaster.tsx; move every remaining maintained frontend/src/components/ui/*.tsx primitive to frontend/src/shared/ui in the same commit, and move frontend/src/hooks/use-toast.ts to frontend/src/shared/ui/use-toast.ts.
  - Delete the obsolete frontend/src/components/ui/use-toast.ts forwarding module and update all consumers through shared UI public modules.
  - Update the app provider consumer without changing notification rendering.
  - Validate: F.

- [x] **Commit 017 — refactor: establish app global style ownership**
  - Change: frontend/src/index.css -> frontend/src/app/styles/globals.css + frontend/src/App.css -> frontend/src/app/styles/app.css.
  - Update only the bootstrap imports; preserve CSS bytes and cascade order.
  - Validate: B.

- [x] **Commit 018 — test: verify foundation public import contracts**
  - Change: frontend/tests/unit/architecture/public-api.unit.test.ts + frontend/scripts/check-fsd-boundaries.mjs.
  - Add assertions for app/shared public APIs and report all remaining legacy-root import owners.
  - Validate: F.

## Phase 2 — App shell, routing, and cross-cutting widgets (18 commits)

**Files:** Modify frontend/src/App.tsx and frontend/src/main.tsx; move global providers, routing, guards, layouts, navigation, offline chrome, and assistant composition into app, widgets, and features.

**Interfaces:** Produces app/App, app/router, app/providers, and widget public APIs. Existing URL strings and guard outcomes remain byte-for-byte identical.

- [x] **Commit 019 — refactor: extract query provider**
  - Change: frontend/src/App.tsx -> frontend/src/app/providers/query-provider.tsx + frontend/src/app/App.tsx.
  - Validate: F.
- [x] **Commit 020 — refactor: extract notification provider**
  - Change: frontend/src/app/App.tsx + frontend/src/app/providers/notification-provider.tsx.
  - Validate: F.
- [x] **Commit 021 — refactor: extract startup network provider**
  - Change: frontend/src/hooks/useStartupNetworkCheck.ts -> frontend/src/app/providers/network-provider.tsx + frontend/src/components/NetworkLoadingScreen.tsx -> frontend/src/shared/ui/network-loading-screen.tsx.
  - Validate: F.
- [x] **Commit 022 — refactor: extract theme route controller**
  - Change: frontend/src/App.tsx + frontend/src/app/providers/theme-controller.tsx + move frontend/src/lib/themePreference.ts to frontend/src/shared/lib/theme-preference.ts so app and profile consumers use the shared theme helper.
  - Preserve force-light routes and profile dark-mode behavior.
  - Validate: F.
- [x] **Commit 023 — refactor: define route path constants**
  - Change: frontend/src/app/router/paths.ts + frontend/src/app/router/paths.unit.test.ts.
  - Validate: F.
- [x] **Commit 024 — refactor: move protected route guard**
  - Change: move the protected guard logic to frontend/src/app/router/guards/protected-route.tsx, remove its legacy export, and keep the current root app as the temporary auth/session adapter until the remaining guards migrate.
  - Validate: F.
- [x] **Commit 025 — refactor: move administrator route guard**
  - Change: move administrator gating to frontend/src/app/router/guards/admin-route.tsx, remove the legacy export, and retain the current root app as its auth-state adapter.
  - Preserve developer and administrator gating.
  - Validate: F.
- [x] **Commit 026 — refactor: move onboarding route guard**
  - Change: move onboarding gating to frontend/src/app/router/guards/onboarding-route.tsx, adapt the root app to its auth state, and remove the obsolete mixed frontend/src/components/ProtectedRoute.tsx module.
  - Validate: F.
- [x] **Commit 027 — refactor: create signed-in app layout**
  - Change: frontend/src/App.tsx + frontend/src/app/layouts/app-layout.tsx. The app layout owns stable screen/navigation/assistant ordering through slots while the remaining legacy widgets are migrated in later commits.
  - Validate: F.
- [x] **Commit 028 — refactor: create public app layout**
  - Change: frontend/src/App.tsx + frontend/src/app/layouts/public-layout.tsx. Public routes now use a transparent layout slot while the root composition remains temporary until the router extraction.
  - Validate: F.
- [x] **Commit 029 — refactor: migrate bottom navigation widget**
  - Change: frontend/src/components/BottomNav.tsx -> frontend/src/widgets/navigation/bottom-nav.tsx + frontend/src/widgets/navigation/index.ts. The widget receives `isAdmin` from app/page adapters so widget ownership remains independent of legacy auth state.
  - Validate: F.
- [x] **Commit 030 — refactor: migrate assistant widget shell**
  - Change: frontend/src/components/AIChatbot.tsx -> frontend/src/widgets/assistant/assistant-widget.tsx + frontend/src/widgets/assistant/index.ts. Authentication state is supplied by the root adapter and request-header behavior remains covered through the widget public API.
  - Validate: F.
- [x] **Commit 031 — refactor: migrate offline status widget**
  - Change: frontend/src/components/OfflineBanner.tsx -> frontend/src/widgets/navigation/offline-banner.tsx + frontend/src/App.tsx. The optional initial-state input is test-only determinism; browser event handling and markup remain unchanged.
  - Validate: F.
- [x] **Commit 032 — refactor: isolate offline synchronization feature**
  - Change: frontend/src/components/OfflineSyncManager.tsx -> frontend/src/features/offline-sync/ui/offline-sync-manager.tsx + frontend/src/features/offline-sync/index.ts. The feature now owns sync orchestration behind an explicit dependency contract; the temporary root adapter supplies existing auth, queue, API, and analysis implementations until their later slice migrations.
  - Validate: I.
- [x] **Commit 033 — refactor: isolate inactivity protection feature**
  - Change: frontend/src/components/InactivityGuard.tsx -> frontend/src/features/auth/ui/inactivity-guard.tsx + frontend/src/App.tsx. The feature receives session and navigation dependencies through its public API, preserving the existing timer and redirect behavior without importing the legacy auth context.
  - Validate: F.
- [x] **Commit 034 — refactor: create application router**
  - Change: frontend/src/App.tsx + frontend/src/app/router/app-router.tsx. Every existing route path is now declared by the app router; legacy page and guard adapters are supplied as route-element slots until later page/provider migrations.
  - Validate: B.
- [x] **Commit 035 — refactor: make main entry app-only**
  - Change: frontend/src/main.tsx + frontend/src/app/index.ts + frontend/src/app/App.tsx. `main.tsx` now imports the app public entry only; startup side effects are exposed through `initializeAppRuntime`, and the temporary root composition is isolated behind the app facade until page migrations complete.
  - Validate: B.
- [x] **Commit 036 — test: verify all legacy route URLs**
  - Change: frontend/tests/e2e/smoke/legacy-route-contract.e2e.spec.ts + frontend/src/app/router/paths.ts. A route contract list now drives the browser smoke coverage for public, inspector, profile, and administrator URLs before page ownership moves.
  - Cover all public, inspector, profile, and admin route URLs before their source pages move.
  - Validate: B.

## Phase 3 — Authentication and user-session migration (16 commits)

**Files:** Move AuthContext, auth clients, passkey helpers, auth pages, auth forms, and guard dependencies into entities/user and features/auth or features/passkeys.

**Interfaces:** Produces user session public API for app guards and feature-specific APIs for authentication and passkey actions. AuthProvider is a thin app provider, not a god context.

- [x] **Commit 037 — refactor: create user session model**
  - Change: frontend/src/contexts/AuthContext.tsx -> frontend/src/entities/user/model/session-types.ts + frontend/src/entities/user/index.ts. Extracted public status discriminants and a bounded session-state shape; the current context consumes the entity-owned vocabulary without moving its implementation yet.
  - Validate: F.
- [x] **Commit 038 — refactor: migrate profile read API**
  - Change: frontend/src/integrations/api/ProfileClient.ts -> frontend/src/entities/user/api/profile-client.ts + frontend/src/entities/user/api/index.ts. All current profile consumers now use the entity API; shared auth-header ownership prevents the entity client from importing legacy cache code.
  - Validate: I.
- [x] **Commit 039 — refactor: migrate authentication API**
  - Change: frontend/src/integrations/api/AuthClient.ts -> frontend/src/features/auth/api/auth-client.ts + frontend/src/features/auth/index.ts. Auth state consumers, offline persistence types, passkey typing, and security tests now depend on the auth feature API.
  - Validate: F.
- [x] **Commit 040 — refactor: migrate passkey browser API**
  - Change: frontend/src/integrations/api/PasskeyClient.ts -> frontend/src/features/passkeys/api/passkey-client.ts + frontend/src/lib/passkeys/browser.ts -> frontend/src/features/passkeys/lib/browser.ts. Auth, login, profile, local-unlock, and passkey tests now consume the passkeys slice API.
  - Validate: F.
- [x] **Commit 041 — refactor: migrate local passkey unlock**
  - Change: frontend/src/lib/passkeys/localUnlock.ts -> frontend/src/features/passkeys/lib/local-unlock.ts + frontend/tests/unit/domain/auth/local-passkey-auth.unit.test.ts. Pure challenge construction and assertion verification now belong to the passkeys feature; the temporary root persistence adapter preserves the current envelope behavior until the session-cache/envelope commits remove it.
  - Validate: F.
- [x] **Commit 042 — refactor: split session cache persistence**
  - Change: frontend/src/contexts/AuthContext.tsx -> frontend/src/entities/user/model/session-cache.ts + frontend/src/lib/authCache.ts -> frontend/src/entities/user/model/session-cache-storage.ts. Auth/profile/admin cache persistence now belongs to the user entity, while auth headers are shared infrastructure and all API clients use that primitive directly.
  - Validate: F.
- [x] **Commit 043 — refactor: split offline auth envelope**
  - Change: moved offline credentials and the offline auth envelope into the user entity model; moved the SQLite auth-envelope adapter into the user entity API and the SQLite bootstrap into shared platform infrastructure, with all queue/cache consumers updated to the new bootstrap path.
  - Validate: focused offline-auth tests, typecheck, lint, and architecture checks passed; full F gate remains the milestone validation.
- [x] **Commit 044 — refactor: split session restoration service**
  - Change: extracted dependency-injected restoration orchestration into `entities/user/model/restore-session.ts` and pure online/offline state construction into `entities/user/model/session-store.ts`; AuthProvider now delegates bootstrap state transitions and restoration while retaining the same public behavior.
  - Validate: 177 unit tests passed, typecheck passed, lint passed with the existing 16 warnings, and architecture checks passed.
- [x] **Commit 045 — refactor: compose thin auth provider**
  - Change: moved `AuthProvider` and `useAuth` to `app/providers/auth-provider.tsx`, added the provider public index, migrated every source and test consumer, and deleted the legacy context file. The provider exposes the existing narrow session API without UI changes.
  - Validate: targeted auth/provider tests (10) passed, typecheck passed, and architecture checks passed; integration gate remains the milestone validation.
- [x] **Commit 046 — refactor: migrate sign-in form workflow**
  - Change: moved the login workflow hook and pure destination/description helpers into `features/auth/model`, injected the session actions to preserve layer direction, and updated the existing login view to consume the feature model. The session context contract now lives in the user entity so pages do not import the app layer.
  - Validate: login workflow, provider, and boundary tests passed; typecheck and integration tests passed.
- [x] **Commit 047 — refactor: migrate sign-up form workflow**
  - Change: moved sign-up state and validation into `features/auth/model`, injected the organization predicate and auth action through the page adapter, and updated the unchanged sign-up view. The offline audit queue and SQLite adapter were also moved behind the offline-sync feature public API because the app provider consumes that capability.
  - Validate: signup and offline-sync contract tests passed, typecheck passed, and lint passed with the existing 16 warnings.
- [x] **Commit 048 — refactor: migrate password recovery workflow**
  - Change: moved the password-recovery hook and error mapping into `features/auth/model`, injected the auth reset action through the existing page adapter, and retained the existing recovery view and behavior.
  - Validate: recovery workflow test, typecheck, and lint passed with the existing 16 warnings.
- [x] **Commit 049 — refactor: migrate password reset workflow**
  - Change: moved reset-password state, recovery parsing, and recovery types into `features/auth/model`; moved sensitive recovery-token URL/session-storage helpers into the shared API public contract; injected the update-password action through the unchanged page view.
  - Validate: reset workflow test, typecheck, and lint passed with the existing 16 warnings.
- [x] **Commit 050 — refactor: create authentication route pages**
  - Change: consolidated the login and sign-up route entries and their unchanged view components under the `pages/auth` slice, added its public index, and updated app route composition to consume that public API.
  - Validate: authentication route-page test, typecheck, and lint passed with the existing 16 warnings; build gate remains the milestone validation.
- [x] **Commit 051 — refactor: create recovery route pages**
  - Change: consolidated forgot-password and reset-password route entries and their unchanged view components under the shared `pages/auth` slice, added public exports, and updated the app route composition.
  - Validate: recovery route-page test, typecheck, and lint passed with the existing 16 warnings; build gate remains the milestone validation.
- [x] **Commit 052 — test: lock authentication route behavior**
  - Change: updated the passkey E2E journey to use the centralized route public contract and retained the migrated session-cleanup assertions against the app provider/entity public APIs.
  - Validate: targeted route/session tests (3), typecheck, and architecture checks passed; integration gate remains the milestone validation.

## Phase 4 — Inspection, camera, offline analysis, history, and reports (36 commits)

**Files:** Migrate the inspection domain, camera feature, offline platform adapters, local inference pipeline, report generation, inspection workspace, and history route.

**Interfaces:** Produces entities/inspection and features for capture, quality checks, submission, offline analysis, and report generation. No moved model, adapter, or component may remain above 600 non-blank lines.

- [x] **Commit 053 — refactor: move inspection domain types**
  - Change: moved inspection domain types into `entities/inspection/model/types.ts`, added the entity public API and stable domain vocabularies, and migrated all source/test consumers off the legacy `types/inspection.ts` path.
  - Validate: inspection domain tests (5), typecheck, lint, and architecture checks passed; no legacy inspection-type imports remain.
- [x] **Commit 054 — refactor: move inspection pre-scan model**
  - Change: moved the pre-scan protocol model into `entities/inspection/model/pre-scan.ts`, exposed it through the inspection entity API, and migrated app/page consumers and tests.
  - Validate: pre-scan unit tests (3), typecheck, and lint passed with the existing 16 warnings.
- [x] **Commit 055 — refactor: move inspection location model**
  - Change: moved coordinate capture and inspection-location formatting into `entities/inspection/model/location.ts`, exposed it through the entity public API, and migrated capture, history, dashboard, and component consumers.
  - Validate: location unit tests (3), typecheck, and lint passed with the existing 16 warnings.
- [x] **Commit 056 — refactor: move inspection endpoint client**
  - Change: moved `InspectionClient` into the inspection entity API, added its public API export, migrated all consumers and integration tests, and moved demo-mode configuration into shared config so the entity has no legacy-library dependency.
  - Validate: integration tests (11), typecheck, and lint passed with the existing 16 warnings.
- [x] **Commit 057 — refactor: create inspection query keys**
  - Change: created the inspection entity query-key contract in `entities/inspection/model/queries.ts`, exported it publicly, and migrated the existing inspection hooks to use centralized list/detail/stat namespaces while moving their session dependency to the user entity API.
  - Validate: query-key test, typecheck, and lint passed with the existing 16 warnings.
- [x] **Commit 058 — refactor: move inspection list domain UI**
  - Change: moved `InspectionListItem` and its domain `FreshnessBadge` dependency into `entities/inspection/ui`, exposed both through the entity public API, and migrated history, dashboard, and component consumers without changing markup or interaction behavior.
  - Validate: component tests (2), typecheck, and lint passed with the existing 16 warnings.
- [x] **Commit 059 — refactor: move inspection result domain UI**
  - Change: moved `AnalysisResultCard` into `entities/inspection/ui`, exposed it through the inspection public API, and migrated the inspection workspace and component tests without changing rendered behavior.
  - Validate: component tests (2), typecheck, and lint passed with the existing 16 warnings.
- [x] **Commit 060 — refactor: split camera capture state**
  - Change: moved the camera session hook into `features/inspection-capture/model/camera-session.ts`, extracted stream acquisition, track inspection, constraint application, and stream cleanup into `camera-device.ts`, and exposed the feature contract through its public index. The existing component facade now consumes the feature hook while the view and quality/control adapters remain behaviorally unchanged for their dedicated migrations.
  - TDD: added camera-device contract tests first (RED on the missing feature API), then implemented the device/session split and reached GREEN without changing camera markup or user-facing behavior.
  - Validate: targeted camera unit tests (4), integration tests (11), typecheck, lint (16 existing warnings), architecture checks, and full unit baseline confirmed; two pre-existing developer-dashboard workspace assertions remain failing outside this change.
- [x] **Commit 061 — refactor: move camera platform adapter**
  - Change: moved the camera quality and `FileReader` adapter into `features/inspection-capture/lib/quality.ts`, updated the session model and camera quality unit contract, and removed the component-owned quality module.
  - TDD: redirected the existing quality contract to the feature path first (RED on the missing module), then moved the adapter and reached GREEN while preserving the test seam, canvas fallback, bitmap path, and data-URL error behavior.
  - Validate: camera quality/device unit tests (6), typecheck, lint (16 existing warnings), and architecture checks passed.
- [x] **Commit 062 — refactor: move camera control calculations**
  - Change: moved camera range parsing, clamping, normalization, formatting, and track-control types into `features/inspection-capture/lib/controls.ts`; migrated the session model, camera view, and camera tests/integration fixtures to the feature-owned module.
  - TDD: redirected the control unit contract first (RED on the missing feature module), then moved the implementation and reached GREEN with the existing control behavior unchanged.
  - Validate: camera unit/integration tests (11), typecheck, lint (16 existing warnings), and architecture checks passed.
- [x] **Commit 063 — refactor: move camera capture UI**
  - Change: moved the camera composition and view into `features/inspection-capture/ui`, moved the capture contracts into the feature model, and converted `components/camera` into a thin compatibility facade that re-exports the feature API. Test and integration consumers now import the feature UI contract directly without changing rendered markup or interactions.
  - TDD: redirected the camera UI contracts first (RED on the missing feature modules), then migrated the UI and model types and reached GREEN through the camera view, facade, session, and quality integration tests.
  - Validate: camera unit/integration tests (8 targeted, 11 integration suite), typecheck, lint (16 existing warnings), architecture checks, and integration suite passed; moved UI files remain below 450 nonblank lines.
- [x] **Commit 064 — refactor: move capture-quality feature**
  - Change: moved the capture-quality gate into `features/inspection-capture/lib/capture-quality.ts`, updated the camera session and Playwright contract to consume the feature module, and exposed the quality API through the feature public index.
  - TDD: redirected the browser contract first (RED with Playwright unable to load the absent feature module), then moved the implementation and reached GREEN with all six capture-quality tests discoverable and camera behavior tests passing.
  - Validate: Playwright capture-quality listing (6 tests), targeted camera unit/integration tests (7), typecheck, lint (16 existing warnings), and architecture checks passed.
- [x] **Commit 065 — refactor: move image-quality feature**
  - Change: moved image-quality validation into `features/inspection-capture/lib/image-quality.ts`, updated the camera quality adapter/session contracts and offline-analysis consumer to use the feature public API, and migrated the 26-case Playwright contract.
  - TDD: redirected the browser contract first (RED on the missing feature module), then moved the implementation and reached GREEN with all 26 image-quality tests passing.
  - Validate: Playwright image-quality tests (26), camera quality/device units (6), typecheck, lint (16 existing warnings), and architecture checks passed.
- [x] **Commit 066 — refactor: create inspection submission feature**
  - Change: created `features/inspection-submission/model/use-submit-inspection.ts` for the query-aware submission mutation and `entities/inspection/model/mutations.ts` for the pure `InspectionInsert` builder; migrated `useInspectPage` to both public contracts and removed the duplicate legacy `useCreateInspection` hook.
  - TDD: added the entity mutation contract first (RED on the missing mutations module), then implemented the builder and feature mutation and reached GREEN while preserving protocol metadata, regulatory compliance, image fallback, and query invalidation behavior.
  - Validate: submission mutation units (2), integration suite (11), typecheck, lint (16 existing warnings), and architecture checks passed.
- [x] **Commit 067 — refactor: move offline queue contract**
  - Change: moved the inspection queue into `features/offline-sync/model/inspection-queue.ts`, completed its public feature exports, and migrated app composition, developer options, and inspection submission consumers off `@/lib/offlineQueue`. The audit queue had already moved in the earlier offline-sync slice; this commit completes the combined queue contract without duplicating it.
  - TDD: added the inspection queue public contract first (RED on missing feature exports), then moved the queue and reached GREEN with both inspection and audit queue contract tests.
  - Validate: offline queue contract tests (2), integration suite (11), typecheck, lint (16 existing warnings), and architecture checks passed.
- [x] **Commit 068 — refactor: move SQLite database bootstrap**
  - Change: completed the shared SQLite platform boundary by adding `shared/platform/sqlite/index.ts`, exposing the existing moved `database.ts` singleton lifecycle, and migrating all current native SQLite adapters from the deep database module to the public platform API.
  - TDD: added the shared SQLite public contract first (RED on the absent index), then added the barrel and reached GREEN without changing connection initialization or migration execution.
  - Validate: SQLite public API unit (1), integration suite (11), typecheck, lint (16 existing warnings), and architecture checks passed.
- [x] **Commit 069 — refactor: move SQLite inspection cache**
  - Change: moved the native inspection cache adapter into `entities/inspection/api/sqlite-cache.ts`, exposed it through the inspection entity API, and routed the existing cross-platform history-cache facade through the entity contract. The offline inspection queue remains a separate model boundary rather than absorbing cache responsibilities.
  - TDD: added the entity cache public contract first (RED on the missing export), then moved and exported the adapter and reached GREEN with cache statistics behavior unchanged.
  - Validate: inspection cache unit (1), integration suite (11), typecheck, lint (16 existing warnings), and architecture checks passed.
- [x] **Commit 070 — refactor: move SQLite offline queues**
  - Change: moved the native inspection queue adapter into `features/offline-sync/api/sqlite-offline-queue.ts`, added the offline-sync API barrel for both native queue adapters, and migrated the inspection queue model off the legacy SQLite path. The audit adapter had already moved in the earlier audit-queue migration and is now included in the same API contract.
  - TDD: added the native adapter contract first (RED on the absent API barrel), then moved the adapter and reached GREEN across inspection and audit adapter/public queue tests.
  - Validate: adapter/public queue units (3), integration suite (11), typecheck, lint (16 existing warnings), and architecture checks passed.
- [x] **Commit 071 — refactor: split model explanation helpers**
  - Change: moved model/rule explanation composition into `features/offline-analysis/lib/model-explanation.ts` and migrated the offline-analysis integration contract to the feature-owned helper without retaining a legacy forwarding module.
  - TDD: redirected the integration contract first (RED on the missing feature helper), then moved the implementation and reached GREEN across disagreement, aligned, and rule-override explanation cases.
  - Validate: offline explanation integration tests (3), full integration suite (11), typecheck, lint (16 existing warnings), and architecture checks passed.
- [x] **Commit 072 — refactor: split MobileNet ONNX runtime**
  - Change: moved the MobileNet ONNX implementation into `features/offline-analysis/lib/mobilenet-runtime.ts` and extracted mutable model-variant/session identity into `mobilenet-session.ts`; analysis runtime, ResNet typing, and the temporary MobileNet facade now consume the feature runtime.
  - TDD: added session lifecycle tests first (RED on the missing feature session module), then introduced the bounded session object and reached GREEN while preserving model switching, generation invalidation, inference, and retry behavior.
  - Validate: MobileNet session units (2), integration suite (11), typecheck, lint (16 existing warnings), and architecture checks passed; runtime/session files remain below 600 nonblank lines.
- [x] **Commit 073 — refactor: move MobileNet model facade**
  - Change: moved the MobileNet facade into `features/offline-analysis/lib/mobilenet.ts`, created the offline-analysis public index, and migrated camera, app composition, and inspection page consumers off the legacy `mobileNetV3` facade.
  - TDD: added the feature public API contract first (RED on the absent index), then moved the facade and reached GREEN with the public MobileNet/session tests and existing integration suite.
  - Validate: MobileNet public/session units (3), integration suite (11), typecheck, lint (16 existing warnings), and architecture checks passed.
- [x] **Commit 074 — refactor: split ResNet runtime**
  - Change: moved `resNet50Onnx.ts` into the offline-analysis feature, extracted mutable ONNX session identity into `ResNetSession`, and migrated the analysis runtime import to the feature-owned runtime.
  - TDD: added the session ownership/reset contract before implementation (RED on the missing module, then GREEN with two focused unit tests).
  - Validate: focused ResNet session tests (2), typecheck, lint, and architecture checks passed; full unit suite reached 198 passing with the same two pre-existing developer-dashboard failures outside this slice.
- [ ] **Commit 075 — refactor: split image geometry preprocessing**
  - Change: frontend/src/lib/offlineAnalysis/meatLensPipeline.ts -> frontend/src/features/offline-analysis/lib/image-crop.ts + frontend/src/features/offline-analysis/lib/image-input.ts. Validate: F.
- [ ] **Commit 076 — refactor: split ROI segmentation**
  - Change: frontend/src/lib/offlineAnalysis/meatLensPipeline.ts -> frontend/src/features/offline-analysis/lib/roi-segmentation.ts + frontend/src/features/offline-analysis/lib/mask-morphology.ts. Validate: F.
- [ ] **Commit 077 — refactor: split tensor and label processing**
  - Change: frontend/src/lib/offlineAnalysis/meatLensPipeline.ts -> frontend/src/features/offline-analysis/lib/tensor-data.ts + frontend/src/features/offline-analysis/lib/classification.ts. Validate: F.
- [ ] **Commit 078 — refactor: move ensemble scoring**
  - Change: frontend/src/lib/offlineAnalysis/ensemble.ts -> frontend/src/features/offline-analysis/lib/ensemble.ts + frontend/src/features/offline-analysis/lib/freshness-score.ts. Validate: F.
- [ ] **Commit 079 — refactor: create bounded analysis facade**
  - Change: frontend/src/lib/offlineAnalysis/index.ts -> frontend/src/features/offline-analysis/api/analyze-inspection.ts + frontend/src/features/offline-analysis/index.ts. Validate: P-offline.
- [ ] **Commit 080 — refactor: move report data types and formatting**
  - Change: frontend/src/lib/reports/types.ts -> frontend/src/features/reports/model/types.ts + frontend/src/lib/reports/formatting.ts -> frontend/src/features/reports/lib/formatting.ts. Validate: F.
- [ ] **Commit 081 — refactor: move report templates**
  - Change: frontend/src/lib/reports/templates/index.ts -> frontend/src/features/reports/lib/templates/index.ts + frontend/tests/unit/domain/analysis/report-template-selection.unit.test.ts. Validate: F.
- [ ] **Commit 082 — refactor: move report section composition**
  - Change: frontend/src/lib/reports/shared/meatSections.ts -> frontend/src/features/reports/lib/meat-sections.ts + frontend/src/lib/reports/pdf/pageFrames.ts -> frontend/src/features/reports/lib/page-frames.ts. Validate: F.
- [ ] **Commit 083 — refactor: split PDF document builder**
  - Change: frontend/src/lib/reports/pdf/buildDocDefinition.ts -> frontend/src/features/reports/lib/pdf/document-header.ts + frontend/src/features/reports/lib/pdf/document-sections.ts. Validate: F.
- [ ] **Commit 084 — refactor: move report chart generation**
  - Change: frontend/src/lib/reports/pdf/reportCharts.ts -> frontend/src/features/reports/lib/pdf/report-charts.ts + frontend/tests/unit/domain/analysis/inspector-pdf-chart-svg.unit.test.ts. Validate: F.
- [ ] **Commit 085 — refactor: create report generation feature API**
  - Change: frontend/src/lib/reports/pdf/composeReportPdf.ts -> frontend/src/features/reports/api/generate-report.ts + frontend/src/features/reports/index.ts. Validate: I.
- [ ] **Commit 086 — refactor: split inspect page view model**
  - Change: frontend/src/pages/user/inspections/hooks/useInspectPage.ts -> frontend/src/widgets/inspection-workspace/model/use-inspection-workspace.ts + frontend/src/widgets/inspection-workspace/model/use-inspection-analysis.ts. Validate: I.
- [ ] **Commit 087 — refactor: move inspection workspace UI**
  - Change: frontend/src/pages/user/inspections/components/InspectPageView.tsx -> frontend/src/widgets/inspection-workspace/ui/inspection-workspace.tsx + frontend/src/pages/Index.tsx -> frontend/src/pages/inspector/inspect-page.tsx. Validate: P-inspect.
- [ ] **Commit 088 — refactor: migrate history page**
  - Change: frontend/src/pages/user/history/hooks/useHistoryPage.ts -> frontend/src/widgets/history/model/use-history.ts + frontend/src/pages/HistoryPage.tsx -> frontend/src/pages/inspector/history-page.tsx. Validate: P-inspect.

## Phase 5 — Profile, messages, onboarding, tutorials, assistant, legal, and landing (18 commits)

**Files:** Migrate the remaining inspector and public-facing flows to FSD slices, including all 450-line review targets in tutorial definitions.

**Interfaces:** Produces isolated user, message, onboarding, tutorial, assistant, legal, and public-page APIs while retaining all current screens.

- [ ] **Commit 089 — refactor: finalize user entity profile model**
  - Change: frontend/src/pages/user/profile/types.ts -> frontend/src/entities/user/model/profile-types.ts + frontend/src/entities/user/api/profile-client.ts. Validate: F.
- [ ] **Commit 090 — refactor: create profile editing feature model**
  - Change: frontend/src/pages/user/profile/hooks/useProfilePage.ts -> frontend/src/features/profile-editing/model/use-profile-editor.ts + frontend/src/features/profile-editing/index.ts. Validate: I.
- [ ] **Commit 091 — refactor: move profile primary UI**
  - Change: frontend/src/pages/user/profile/components/ProfilePrimaryColumn.tsx -> frontend/src/widgets/profile/profile-primary-column.tsx + frontend/src/pages/user/profile/components/ProfileEditableDetailsCard.tsx -> frontend/src/features/profile-editing/ui/editable-details-card.tsx. Validate: F.
- [ ] **Commit 092 — refactor: move profile secondary UI**
  - Change: frontend/src/pages/user/profile/components/ProfileSecondaryColumn.tsx -> frontend/src/widgets/profile/profile-secondary-column.tsx + frontend/src/pages/user/profile/components/ProfileSummaryCard.tsx -> frontend/src/entities/user/ui/profile-summary-card.tsx. Validate: F.
- [ ] **Commit 093 — refactor: migrate profile route page**
  - Change: frontend/src/pages/user/profile/components/ProfilePageView.tsx -> frontend/src/widgets/profile/profile-widget.tsx + frontend/src/pages/ProfilePage.tsx -> frontend/src/pages/inspector/profile-page.tsx. Validate: P-inspect.
- [ ] **Commit 094 — refactor: create message entity**
  - Change: frontend/src/integrations/api/UserChatClient.ts -> frontend/src/entities/message/api/message-client.ts + frontend/src/entities/message/model/types.ts. Validate: I.
- [ ] **Commit 095 — refactor: split message view state**
  - Change: frontend/src/pages/user/messages/utils/viewState.ts -> frontend/src/features/messaging/model/view-state.ts + frontend/tests/unit/state/messages-view-state.unit.test.ts. Validate: F.
- [ ] **Commit 096 — refactor: move message thread widget**
  - Change: frontend/src/pages/user/messages/components/ThreadPanel.tsx -> frontend/src/widgets/messages/thread-panel.tsx + frontend/src/widgets/messages/index.ts. Validate: F.
- [ ] **Commit 097 — refactor: move message contacts widget**
  - Change: frontend/src/pages/user/messages/components/ContactsPanel.tsx -> frontend/src/widgets/messages/contacts-panel.tsx + frontend/src/pages/user/messages/hooks/useMessagesPage.ts -> frontend/src/features/messaging/model/use-messages.ts. Validate: I.
- [ ] **Commit 098 — refactor: migrate messages route page**
  - Change: frontend/src/pages/MessagesPage.tsx -> frontend/src/pages/inspector/messages-page.tsx + frontend/src/pages/user/messages/components/MessagesHeader.tsx -> frontend/src/widgets/messages/messages-header.tsx. Validate: P-inspect.
- [ ] **Commit 099 — refactor: create onboarding feature model**
  - Change: frontend/src/lib/onboardingSession.ts -> frontend/src/features/onboarding/model/session.ts + frontend/src/pages/user/onboarding/hooks/useOnboardingPage.ts -> frontend/src/features/onboarding/model/use-onboarding.ts. Validate: F.
- [ ] **Commit 100 — refactor: migrate onboarding route page**
  - Change: frontend/src/pages/user/onboarding/components/OnboardingPageView.tsx -> frontend/src/features/onboarding/ui/onboarding-page.tsx + frontend/src/pages/OnboardingPage.tsx -> frontend/src/pages/inspector/onboarding-page.tsx. Validate: P-inspect.
- [ ] **Commit 101 — refactor: split tutorial definitions**
  - Change: frontend/src/lib/tutorials/tutorialDefinitions.ts -> frontend/src/features/tutorials/model/inspection-tutorial.ts + frontend/src/features/tutorials/model/profile-tutorial.ts. Validate: F.
- [ ] **Commit 102 — refactor: move tutorial player components**
  - Change: frontend/src/components/tutorial/TutorialPlayer.tsx -> frontend/src/features/tutorials/ui/tutorial-player.tsx + frontend/src/components/tutorial/TutorialScene.tsx -> frontend/src/features/tutorials/ui/tutorial-scene.tsx. Validate: F.
- [ ] **Commit 103 — refactor: migrate profile help routes**
  - Change: frontend/src/pages/ProfileHelpPage.tsx -> frontend/src/pages/inspector/profile-help-page.tsx + frontend/src/pages/ProfileHelpScopePage.tsx -> frontend/src/pages/inspector/profile-help-scope-page.tsx. Validate: P-inspect.
- [ ] **Commit 104 — refactor: migrate profile tutorial route**
  - Change: frontend/src/pages/ProfileTutorialPage.tsx -> frontend/src/pages/inspector/profile-tutorial-page.tsx + frontend/src/features/tutorials/index.ts. Validate: F.
- [ ] **Commit 105 — refactor: split assistant feature and widget**
  - Change: frontend/src/components/AIChatbot.tsx -> frontend/src/features/assistant/model/use-assistant.ts + frontend/src/widgets/assistant/assistant-widget.tsx. Validate: P-inspect.
- [ ] **Commit 106 — refactor: migrate legal and landing page ownership**
  - Change: frontend/src/components/TermsAndConditionsContent.tsx -> frontend/src/widgets/legal/terms-content.tsx + frontend/src/pages/LandingPage.tsx -> frontend/src/pages/public/landing-page.tsx; move every frontend/src/pages/landing/landing-page component, hook, type, and utility to frontend/src/widgets/public-landing or frontend/src/pages/public as classified by the transfer manifest. Validate: B.

## Phase 6 — Administrator and developer migration (30 commits)

**Files:** Move admin endpoint clients, dashboard state, tab content, desktop/mobile views, developer tools, and API documentation into entities, features, widgets, and pages. Split every oversized dashboard module below 600 non-blank lines.

**Interfaces:** Produces the admin-dashboard widget and admin-management/developer-tools features. No page or widget owns an endpoint client directly.

- [ ] **Commit 107 — refactor: create access-code entity API**
  - Change: frontend/src/integrations/api/AccessCodeClient.ts -> frontend/src/entities/access-code/api/access-code-client.ts + frontend/src/entities/access-code/index.ts. Validate: I.
- [ ] **Commit 108 — refactor: create audit-log entity API**
  - Change: frontend/src/integrations/api/AuditLogClient.ts -> frontend/src/entities/audit-log/api/audit-log-client.ts + frontend/src/entities/audit-log/index.ts. Validate: I.
- [ ] **Commit 109 — refactor: create market-location entity API**
  - Change: frontend/src/integrations/api/MarketLocationClient.ts -> frontend/src/entities/market-location/api/market-location-client.ts + frontend/src/entities/market-location/index.ts. Validate: I.
- [ ] **Commit 110 — refactor: create developer metrics entity API**
  - Change: frontend/src/integrations/api/DeveloperDashboardClient.ts -> frontend/src/entities/developer-metrics/api/developer-dashboard-client.ts + frontend/src/entities/developer-metrics/index.ts. Validate: I.
- [ ] **Commit 111 — refactor: create developer options feature API**
  - Change: frontend/src/integrations/api/DeveloperOptionsClient.ts -> frontend/src/features/developer-tools/api/developer-options-client.ts + frontend/src/features/developer-tools/index.ts. Validate: I.
- [ ] **Commit 112 — refactor: create admin dashboard model types**
  - Change: frontend/src/pages/admin-dashboard/types.ts -> frontend/src/widgets/admin-dashboard/model/types.ts + frontend/src/pages/admin-dashboard/utils/adminDashboard.ts -> frontend/src/widgets/admin-dashboard/lib/dashboard.ts. Validate: F.
- [ ] **Commit 113 — refactor: split dashboard overview state**
  - Change: frontend/src/pages/admin-dashboard/hooks/useAdminDashboardPage.ts -> frontend/src/widgets/admin-dashboard/model/use-overview-tab.ts + frontend/src/widgets/admin-dashboard/model/use-dashboard-session.ts. Validate: F.
- [ ] **Commit 114 — refactor: split dashboard inspection state**
  - Change: frontend/src/pages/admin-dashboard/hooks/useAdminDashboardPage.ts -> frontend/src/widgets/admin-dashboard/model/use-inspections-tab.ts + frontend/src/widgets/admin-dashboard/model/use-inspection-pagination.ts. Validate: F.
- [ ] **Commit 115 — refactor: split dashboard user state**
  - Change: frontend/src/pages/admin-dashboard/hooks/useAdminDashboardPage.ts -> frontend/src/widgets/admin-dashboard/model/use-users-tab.ts + frontend/src/widgets/admin-dashboard/model/use-user-actions.ts. Validate: F.
- [ ] **Commit 116 — refactor: split dashboard access-code state**
  - Change: frontend/src/pages/admin-dashboard/hooks/useAdminDashboardPage.ts -> frontend/src/features/admin-management/model/use-access-codes.ts + frontend/src/features/admin-management/model/use-access-code-form.ts. Validate: F.
- [ ] **Commit 117 — refactor: split dashboard log state**
  - Change: frontend/src/pages/admin-dashboard/hooks/useAdminDashboardPage.ts -> frontend/src/widgets/admin-dashboard/model/use-logs-tab.ts + frontend/src/widgets/admin-dashboard/model/use-log-filters.ts. Validate: F.
- [ ] **Commit 118 — refactor: split dashboard market state**
  - Change: frontend/src/pages/admin-dashboard/hooks/useAdminDashboardPage.ts -> frontend/src/features/admin-management/model/use-market-locations.ts + frontend/src/features/admin-management/model/use-market-form.ts. Validate: F.
- [ ] **Commit 119 — refactor: split dashboard report state**
  - Change: frontend/src/pages/admin-dashboard/hooks/useAdminDashboardPage.ts -> frontend/src/features/reports/model/use-admin-report.ts + frontend/src/widgets/admin-dashboard/model/use-reports-tab.ts. Validate: F.
- [ ] **Commit 120 — refactor: compose bounded dashboard workspace hook**
  - Change: frontend/src/pages/admin-dashboard/hooks/useAdminDashboardPage.ts -> frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts + frontend/src/pages/admin-dashboard/hooks/useDeveloperDashboard.ts -> frontend/src/features/developer-tools/model/use-developer-dashboard.ts. Validate: I.
- [ ] **Commit 121 — refactor: split overview tab UI**
  - Change: frontend/src/pages/admin-dashboard/components/tab-content/OverviewTabContent.tsx -> frontend/src/widgets/admin-dashboard/ui/overview/summary-cards.tsx + frontend/src/widgets/admin-dashboard/ui/overview/inspection-chart.tsx. Validate: F.
- [ ] **Commit 122 — refactor: complete overview tab widget**
  - Change: frontend/src/pages/admin-dashboard/components/tab-content/OverviewTabContent.tsx -> frontend/src/widgets/admin-dashboard/ui/overview/overview-tab.tsx + frontend/tests/unit/hooks/admin-dashboard-summary.unit.test.tsx. Validate: F.
- [ ] **Commit 123 — refactor: split users tab UI**
  - Change: frontend/src/pages/admin-dashboard/components/tab-content/UsersTabContent.tsx -> frontend/src/widgets/admin-dashboard/ui/users/user-table.tsx + frontend/src/widgets/admin-dashboard/ui/users/user-actions.tsx. Validate: F.
- [ ] **Commit 124 — refactor: complete users tab widget**
  - Change: frontend/src/pages/admin-dashboard/components/tab-content/UsersTabContent.tsx -> frontend/src/widgets/admin-dashboard/ui/users/users-tab.tsx + frontend/src/widgets/admin-dashboard/index.ts. Validate: F.
- [ ] **Commit 125 — refactor: migrate inspections tab widget**
  - Change: frontend/src/pages/admin-dashboard/components/tab-content/InspectionsTabContent.tsx -> frontend/src/widgets/admin-dashboard/ui/inspections-tab.tsx + frontend/src/pages/admin-dashboard/desktop/components/InspectionsTab.tsx -> frontend/src/widgets/admin-dashboard/ui/desktop-inspections-tab.tsx. Validate: F.
- [ ] **Commit 126 — refactor: migrate access-code tab widget**
  - Change: frontend/src/pages/admin-dashboard/components/tab-content/AccessCodesTabContent.tsx -> frontend/src/widgets/admin-dashboard/ui/access-codes-tab.tsx + frontend/src/pages/admin-dashboard/mobile/components/AccessCodesTab.tsx -> frontend/src/widgets/admin-dashboard/ui/mobile-access-codes-tab.tsx. Validate: F.
- [ ] **Commit 127 — refactor: migrate audit-log tab widget**
  - Change: frontend/src/pages/admin-dashboard/components/tab-content/LogsTabContent.tsx -> frontend/src/widgets/admin-dashboard/ui/logs-tab.tsx + frontend/src/pages/admin-dashboard/desktop/components/LogsTab.tsx -> frontend/src/widgets/admin-dashboard/ui/desktop-logs-tab.tsx. Validate: F.
- [ ] **Commit 128 — refactor: migrate market tab widget**
  - Change: frontend/src/pages/admin-dashboard/components/tab-content/MarketsTabContent.tsx -> frontend/src/widgets/admin-dashboard/ui/markets-tab.tsx + frontend/src/pages/admin-dashboard/mobile/components/MarketsTab.tsx -> frontend/src/widgets/admin-dashboard/ui/mobile-markets-tab.tsx. Validate: F.
- [ ] **Commit 129 — refactor: migrate reports tab widget**
  - Change: frontend/src/pages/admin-dashboard/components/tab-content/DesktopReportsTabContent.tsx -> frontend/src/widgets/admin-dashboard/ui/reports-tab.tsx + frontend/src/pages/admin-dashboard/components/tab-content/MobileReportsTabContent.tsx -> frontend/src/widgets/admin-dashboard/ui/mobile-reports-tab.tsx. Validate: F.
- [ ] **Commit 130 — refactor: split developer overview section**
  - Change: frontend/src/pages/admin-dashboard/components/developer/DeveloperOverviewSection.tsx -> frontend/src/features/developer-tools/ui/developer-metrics.tsx + frontend/src/features/developer-tools/ui/developer-export.tsx; move frontend/src/components/DeveloperOptionsPanel.tsx into frontend/src/features/developer-tools/ui/developer-options-panel.tsx. Validate: F.
- [ ] **Commit 131 — refactor: migrate developer data sections**
  - Change: frontend/src/pages/admin-dashboard/components/developer/DeveloperDatasetsSection.tsx -> frontend/src/features/developer-tools/ui/datasets-section.tsx + frontend/src/pages/admin-dashboard/components/developer/DeveloperTrainingSection.tsx -> frontend/src/features/developer-tools/ui/training-section.tsx. Validate: F.
- [ ] **Commit 132 — refactor: migrate API documentation model**
  - Change: frontend/src/pages/admin-dashboard/components/developer/api-docs/catalog.ts -> frontend/src/features/developer-tools/model/api-docs-catalog.ts + frontend/src/pages/admin-dashboard/components/developer/api-docs/types.ts -> frontend/src/features/developer-tools/model/api-docs-types.ts. Validate: F.
- [ ] **Commit 133 — refactor: migrate API documentation request flow**
  - Change: frontend/src/pages/admin-dashboard/components/developer/api-docs/request.ts -> frontend/src/features/developer-tools/model/api-docs-request.ts + frontend/src/pages/admin-dashboard/components/developer/api-docs/useApiDocs.ts -> frontend/src/features/developer-tools/model/use-api-docs.ts. Validate: F.
- [ ] **Commit 134 — refactor: migrate API documentation UI**
  - Change: frontend/src/pages/admin-dashboard/components/developer/api-docs/ApiDocsSection.tsx -> frontend/src/features/developer-tools/ui/api-docs-section.tsx + frontend/src/pages/admin-dashboard/components/developer/api-docs/ApiDocsResponsePanel.tsx -> frontend/src/features/developer-tools/ui/api-docs-response-panel.tsx. Validate: F.
- [ ] **Commit 135 — refactor: compose desktop and mobile admin widgets**
  - Change: frontend/src/pages/admin-dashboard/components/AdminDashboardDesktopPage.tsx -> frontend/src/widgets/admin-dashboard/ui/admin-dashboard-desktop.tsx + frontend/src/pages/admin-dashboard/components/AdminDashboardMobilePage.tsx -> frontend/src/widgets/admin-dashboard/ui/admin-dashboard-mobile.tsx. Validate: P-admin.
- [ ] **Commit 136 — refactor: migrate admin route page**
  - Change: frontend/src/pages/AdminDashboardWrapper.tsx -> frontend/src/pages/admin/admin-dashboard-page.tsx + frontend/src/app/router/app-router.tsx. Validate: P-admin.

## Phase 7 — Final legacy purge and release verification (8 commits)

**Files:** Remove every obsolete root owner, move remaining tests beside their FSD slice where appropriate, turn report-mode checks into hard gates, and perform the final structural audit.

**Interfaces:** Produces a frontend in which all production source belongs to its final FSD layer, no compatibility import survives, all owned files are at most 600 non-blank lines, and the migration commit audit shows at least 144 qualifying commits.

- [ ] **Commit 137 — refactor: remove remaining legacy component ownership**
  - Change: delete frontend/src/components/ConfirmDialog.tsx after moving its last consumer to frontend/src/shared/ui/confirm-dialog.tsx + move frontend/src/components/PageHeader.tsx to frontend/src/shared/ui/page-header.tsx.
  - Complete every remaining frontend/src/components transfer listed in the manifest and update every consumer through public APIs. Validate: F.
- [ ] **Commit 138 — refactor: remove remaining legacy hook ownership**
  - Change: delete frontend/src/hooks/use-toast.ts after moving it to frontend/src/shared/hooks/use-toast.ts + move frontend/src/hooks/useMounted.ts to frontend/src/shared/hooks/use-mounted.ts.
  - Validate: F.
- [ ] **Commit 139 — refactor: remove remaining legacy API ownership**
  - Change: delete frontend/src/integrations/api/index.ts + delete frontend/src/integrations/api/UploadClient.ts after its final consumer moves to frontend/src/features/inspection-submission/api/upload-client.ts.
  - Validate: I.
- [ ] **Commit 140 — refactor: remove remaining legacy library ownership**
  - Change: delete frontend/src/lib/demoMode.ts + delete frontend/src/lib/themePreference.ts after moving their last consumers into app or feature slices; complete every remaining frontend/src/lib transfer listed in the manifest.
  - Validate: F.
- [ ] **Commit 141 — refactor: remove root legacy pages**
  - Change: delete frontend/src/pages/AdminDashboard.tsx + delete frontend/src/pages/DesktopAdminDashboard.tsx after route ownership is fully pages/admin; complete every root-page and nested-page transfer listed in the manifest.
  - Validate: P-admin.
- [ ] **Commit 142 — test: enable mandatory architecture and size gates**
  - Change: frontend/package.json + frontend/scripts/check-fsd-boundaries.mjs.
  - Make the CI command fail on every non-FSD production owner, deep import, upward import, or maintained source file over 600 non-blank lines.
  - Validate: F.
- [ ] **Commit 143 — test: audit public slice APIs and legacy absence**
  - Change: frontend/tests/unit/architecture/final-fsd-audit.unit.test.ts + frontend/scripts/check-source-size.mjs.
  - Assert that no legacy root owner, bridge alias, or compatibility re-export is present and that every maintained source file is within the cap.
  - Validate: B.
- [ ] **Commit 144 — test: complete full-migration regression audit**
  - Change: frontend/tests/e2e/smoke/not-found.e2e.spec.ts + frontend/tests/e2e/journeys/administrator/admin-dashboard.e2e.spec.ts.
  - Run typecheck, lint, all architecture checks, full frontend unit/component/integration suite, production build, critical end-to-end suite, then verify the commit ledger has at least 144 qualifying implementation commits.
  - Validate: npm run typecheck -w frontend && npm run lint -w frontend && npm run test:unit -w frontend && npm run test:component -w frontend && npm run test:integration -w frontend && npm run build -w frontend && npm run test:e2e:critical -w frontend.

## Exhaustive legacy owner transfer manifest

The following current owners must have no production files at completion. A path ending in /** means every maintained source file under that path moves to the stated final owner or is deleted only after the architecture check proves it has no consumer.

| Current owner | Final FSD owner |
| --- | --- |
| frontend/src/components/ui/** | frontend/src/shared/ui/** |
| frontend/src/components/camera/** and frontend/src/components/CameraCapture.tsx | frontend/src/features/inspection-capture/{ui,model,lib}/** |
| frontend/src/components/tutorial/** and frontend/src/components/help/** | frontend/src/features/tutorials/{ui,model,lib}/** |
| frontend/src/components/AIChatbot.tsx | frontend/src/widgets/assistant/** and frontend/src/features/assistant/** |
| frontend/src/components/AnalysisResultCard.tsx, FreshnessBadge.tsx, InspectionDetailSheet.tsx, InspectionListItem.tsx | frontend/src/entities/inspection/ui/** |
| frontend/src/components/BottomNav.tsx and NavLink.tsx | frontend/src/widgets/navigation/** |
| frontend/src/components/ConfirmDialog.tsx, MetricCard.tsx, PageHeader.tsx | frontend/src/shared/ui/** or the single owning widget |
| frontend/src/components/DeviceSpecsChecker.tsx | frontend/src/features/inspection-capture/ui/** |
| frontend/src/components/InactivityGuard.tsx | frontend/src/features/auth/ui/** |
| frontend/src/components/NetworkLoadingScreen.tsx | frontend/src/shared/ui/** |
| frontend/src/components/OfflineBanner.tsx | frontend/src/widgets/navigation/** |
| frontend/src/components/OfflineSyncManager.tsx | frontend/src/features/offline-sync/ui/** |
| frontend/src/components/PrivacyPolicyContent.tsx, PrivacyPolicyDialog.tsx, TermsAndConditionsContent.tsx, TermsAndConditionsDialog.tsx | frontend/src/widgets/legal/** |
| frontend/src/components/ProtectedRoute.tsx | frontend/src/app/router/guards/** |
| frontend/src/components/landing/old.ts | delete after check-fsd-boundaries.mjs proves it has no import |
| frontend/src/contexts/AuthContext.tsx | frontend/src/app/providers/auth-provider.tsx plus frontend/src/entities/user/model/** |
| frontend/src/hooks/useStartupNetworkCheck.ts | frontend/src/app/providers/network-provider.tsx |
| frontend/src/integrations/api/{AccessCodeClient,AuditLogClient,InspectionClient,MarketLocationClient,ProfileClient,StatsClient,UserChatClient}.ts | their matching frontend/src/entities/*/api/** owners |
| frontend/src/integrations/api/{AuthClient,PasskeyClient,UploadClient,DeveloperOptionsClient}.ts | their matching frontend/src/features/*/api/** owners |
| frontend/src/integrations/api/{DeveloperDashboardClient,apiBaseUrl,apiRequest,fetchWithTimeout,index}.ts | frontend/src/entities/developer-metrics/api/** or frontend/src/shared/api/** |
| frontend/src/lib/{authCache,authUrlHash,offlineAuthEnvelope,offlineCredentials}.ts | frontend/src/entities/user/model/** or frontend/src/features/auth/** |
| frontend/src/lib/{captureQuality,imageQuality,confidenceLevel}.ts | frontend/src/features/inspection-capture/lib/** or frontend/src/entities/inspection/lib/** |
| frontend/src/lib/{inspectionHistoryCache,inspectionLocation,inspectionPreScan}.ts | frontend/src/entities/inspection/{model,api}/** |
| frontend/src/lib/{developerOptions,marketLocations}.ts | frontend/src/features/developer-tools/** or frontend/src/entities/market-location/** |
| frontend/src/lib/{offlineAuditQueue,offlineQueue}.ts and frontend/src/lib/sqlite/** | frontend/src/features/offline-sync/**, frontend/src/entities/inspection/**, and frontend/src/shared/platform/sqlite/** |
| frontend/src/lib/{reportLetterheads,reportOrganizations}.ts and frontend/src/lib/reports/** | frontend/src/features/reports/{api,lib,model}/** |
| frontend/src/lib/{demoMode,onboardingSession,themePreference}.ts | frontend/src/app/** or their matching feature/model owner |
| frontend/src/lib/help/** and frontend/src/lib/tutorials/** | frontend/src/features/tutorials/** |
| frontend/src/lib/offlineAnalysis/** | frontend/src/features/offline-analysis/** |
| frontend/src/lib/passkeys/** | frontend/src/features/passkeys/** |
| frontend/src/pages/landing/{login,signup,forget-password,reset-password}/** | frontend/src/features/auth/** plus frontend/src/pages/auth/** |
| frontend/src/pages/landing/landing-page/** | frontend/src/widgets/public-landing/** plus frontend/src/pages/public/landing-page.tsx |
| frontend/src/pages/not-found/** | frontend/src/pages/public/not-found-page.tsx |
| frontend/src/pages/user/inspections/** and frontend/src/pages/{Index,HistoryPage}.tsx | frontend/src/widgets/inspection-workspace/**, frontend/src/widgets/history/**, and frontend/src/pages/inspector/** |
| frontend/src/pages/user/profile/** and frontend/src/pages/ProfilePage.tsx | frontend/src/entities/user/**, frontend/src/features/profile-editing/**, frontend/src/widgets/profile/**, and frontend/src/pages/inspector/** |
| frontend/src/pages/user/messages/** and frontend/src/pages/MessagesPage.tsx | frontend/src/entities/message/**, frontend/src/features/messaging/**, frontend/src/widgets/messages/**, and frontend/src/pages/inspector/** |
| frontend/src/pages/user/onboarding/**, frontend/src/pages/user/tutorials/**, and frontend/src/pages/{OnboardingPage,ProfileHelpPage,ProfileHelpScopePage,ProfileTutorialPage}.tsx | frontend/src/features/{onboarding,tutorials}/** and frontend/src/pages/inspector/** |
| frontend/src/pages/admin-dashboard/** and frontend/src/pages/{AdminDashboard,AdminDashboardWrapper,DesktopAdminDashboard}.tsx | frontend/src/entities/{access-code,audit-log,market-location,developer-metrics}/**, frontend/src/features/{admin-management,developer-tools,reports}/**, frontend/src/widgets/admin-dashboard/**, and frontend/src/pages/admin/** |
| frontend/src/{App.tsx,App.css,index.css} | frontend/src/app/{App.tsx,styles/app.css,styles/globals.css} |

## Final execution audit

- [ ] Confirm frontend/src contains only app, pages, widgets, features, entities, shared, main.tsx, vite-env.d.ts, and test-only support where required by Vite.
- [ ] Confirm frontend/src/components, frontend/src/contexts, frontend/src/hooks, frontend/src/integrations, frontend/src/lib, the legacy root frontend/src/pages layout, frontend/src/App.tsx, frontend/src/App.css, and frontend/src/index.css no longer own production architecture.
- [ ] Run node frontend/scripts/check-fsd-boundaries.mjs --enforce and node frontend/scripts/check-source-size.mjs --enforce with zero violations.
- [ ] Review the execution log and confirm every qualifying commit contains a focused RED failure, a minimal GREEN implementation, and a post-green REFACTOR validation where refactoring was needed.
- [ ] Run git log from the first migration commit through the final migration commit and verify at least 144 qualifying commits. For each, inspect git show --stat --oneline <sha> and confirm two or more non-empty changed files and one meaningful source/test, source/consumer, or source/configuration unit.
- [ ] Run the validation command from Commit 144 and preserve its successful output in the execution handoff.
