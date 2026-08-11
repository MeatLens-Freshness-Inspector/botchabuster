# Frontend Feature-Sliced Refactor Design

## Goal

Refactor the MeatLens frontend into a scalable Feature-Sliced Design (FSD) architecture without changing its UI, UX, routes, copy, permissions, API contracts, native behavior, or existing user-facing functionality.

## Scope and invariants

- Preserve every current route URL, redirect, guard, permission rule, rendered experience, interaction, and API request/response contract.
- Preserve Capacitor camera, network, SQLite, passkey, offline synchronization, local inference, reporting, and administrator/developer workflows.
- Treat current unit, component, integration, and end-to-end tests as behavior contracts throughout the migration.
- Do not redesign components, change visual styling, alter content, introduce features, change the backend, or perform a big-bang rewrite.
- Migrate in independently releasable slices. A phase is complete only after its targeted validation passes and its compatibility boundary is explicit.
- This is a full-scale migration, not a partial reorganization. The completed frontend contains only the FSD architecture defined here; it retains no legacy architectural layer, legacy root ownership, compatibility facade, or legacy import alias.
- The implementation must produce at least 140 qualifying migration commits after this design phase. A qualifying commit changes at least two non-empty files, delivers one independently verifiable architectural or behavior-preserving refactor unit, and is neither empty, single-file, merge-only, lockfile-only, formatting-only, nor created solely to increase the count.
- Production source files use a 450-line split trigger and an absolute 600 non-blank-line limit. The limit applies to React components, hooks, contexts, classes, services, modules, and configuration with executable logic; generated, vendored, and third-party source is excluded only when it is not maintained by this project.

## Target architecture

The frontend will use the formal FSD layers below. A layer may import only from layers below it. Slices at the same layer do not import each other's internals; consumers use a slice's public `index.ts` API.

```text
src/
  app/        application bootstrap, providers, router, layouts, global configuration/styles
  pages/      route-level composition only
  widgets/    reusable, autonomous page sections composed from lower layers
  features/   user-facing actions and workflows
  entities/   reusable business-domain state, API, types, and domain UI
  shared/     product-agnostic primitives, utilities, transport, assets, and configuration
```

Each slice uses only the segments it needs:

```text
<slice>/
  api/        domain endpoint clients and query integration
  model/      domain types, state, query keys, selectors, and validation
  ui/         presentational and connected UI owned by the slice
  lib/        slice-private helpers and adapters
  config/     slice-local static configuration, when justified
  index.ts    the slice's public import surface
```

### Layer responsibilities

`app` owns `main.tsx`, global providers, Query Client configuration, route definitions, layouts, startup/network gating, global error boundaries, and global CSS. It is the only layer that assembles application-wide providers.

`pages` maps a route to widgets, features, and entities. Pages may select route parameters and compose a screen, but must not contain endpoint clients, business workflow state, or reusable business UI.

`widgets` owns reusable screen-scale compositions such as the signed-in navigation shell, the inspection workspace composition, and the administrator dashboard composition. Widgets combine lower-layer public APIs but do not become catch-all shared components.

`features` owns discrete user intentions: sign in/sign up/reset password, passkey enrollment and unlock, capture an inspection, submit an inspection, edit profile details, send a message, manage access codes, and generate or export reports.

`entities` owns durable product concepts and their reusable representations. The initial domain slices are `inspection`, `user` (including current-session domain state), `message`, `audit-log`, `access-code`, and `market-location`. Entity reads, query keys, domain types, and reusable domain UI live together.

`shared` owns generic UI primitives, the HTTP transport (`apiRequest`, timeout handling, base-URL resolution, auth-header mechanics, and normalized transport errors), generic hooks, utilities, configuration, assets, and platform abstractions. It never imports a business layer.

## Data, API, and state ownership

```text
Route page -> widget -> feature -> entity -> shared
                       \-> React Query / offline persistence <-/
```

- Shared transport performs requests but knows no endpoint-specific domain behavior.
- Entity slices own endpoint-specific read clients, query keys, server types, and cache read models.
- Feature slices own user-triggered mutations, form state, interaction state, and workflow-specific validation.
- The app shell supplies cross-cutting providers and connects authenticated session state to routing, but does not own feature workflow state.
- Offline queue, SQLite, local inference, and Capacitor adapters remain behind stable domain or platform interfaces. Their observable behavior and persistence formats do not change during this refactor.

Errors retain their current user-visible outcomes. Shared transport normalizes request failures into a typed error contract; the responsible feature or page boundary maps that contract to the existing loading, retry, toast, banner, or fallback behavior. No generic error treatment may change screen copy or interaction without a separate UX-approved change.

## Object-oriented design policy

React components, hooks, route composition, view state, and simple transformations remain functional. The refactor does not introduce React class components or turn straightforward helpers into classes.

Use classes only when they materially improve encapsulation, lifecycle ownership, or testability for stateful infrastructure and domain services. Suitable candidates include offline queues, SQLite/Capacitor persistence adapters, API-client adapters with configurable dependencies, report builders, and local-inference pipeline orchestration. Each class must expose a narrow interface, receive dependencies explicitly, and remain outside React rendering code. Functional modules remain the default when a class adds no meaningful boundary.

No class, context, hook, component, service, or module may become a god object. At 450 non-blank lines, the owner must split it by a real responsibility boundary before adding further behavior; no maintained production file may exceed 600 non-blank lines. A context coordinates provider wiring and exposes a narrow state contract, but does not combine authentication, profile fetching, cache persistence, passkeys, route decisions, and unrelated mutations in one module. The current oversized administrator, authentication, inspection, and offline-analysis modules are explicit decomposition targets, not exceptions.

## Dependency rules

- `app` may import from every lower layer.
- `pages` may import from `widgets`, `features`, `entities`, and `shared`.
- `widgets` may import from `features`, `entities`, and `shared`.
- `features` may import from `entities` and `shared`.
- `entities` may import from `shared`.
- `shared` imports only external packages and other shared modules.
- Cross-slice imports use the exporting slice's `index.ts`; deep imports are prohibited outside the slice.
- Do not introduce compatibility re-exports, legacy aliases, or a parallel legacy layer. A migration commit moves a bounded slice together with every consumer it changes; any unavoidable bridge must be resolved in that same commit and cannot persist into the next commit.

The dependency rules will be checked through ESLint restricted-import rules and a focused architecture test or script, so violations fail local validation and CI instead of relying on convention.

## Test strategy

- Keep the current frontend test suite executable from the first migration commit onward.
- Enable the runner to discover both the existing top-level tests and colocated slice tests during the transition.
- Move unit and component tests with the slice they verify once that slice is stable. Keep cross-slice integration and Playwright end-to-end journeys in the shared `tests/` hierarchy.
- Add focused regression coverage whenever a large module is split, concentrating on public API compatibility, query/mutation behavior, offline persistence boundaries, route guards, and import-boundary rules.
- Apply test-driven development to every production refactor unit: write the smallest behavior, characterization, import-contract, or architecture test first; run it and observe the expected RED failure; implement the minimal GREEN change; then refactor only while the tests remain green. Pure relocations require a failing public-import or characterization test, and runtime-affecting configuration requires a failing fixture test before the configuration change.
- Add an automated non-blank-line source-size check. It fails at more than 600 lines and reports files at or above the 450-line split trigger for mandatory review before the phase can continue.
- Validate each migration phase with typecheck, lint, the source-size and architecture checks, targeted unit/component/integration tests, a production build, and the affected critical Playwright journey. The final phase runs the full frontend suite.

## Migration sequence

```text
Foundation and architecture enforcement (minimum 18 commits)
  -> shared transport, platform boundaries, and app shell (minimum 18 commits)
  -> public/authentication/session flows (minimum 16 commits)
  -> inspector, camera, offline analysis, history, and reports (minimum 36 commits)
  -> profile, messages, onboarding, tutorials, and assistant (minimum 18 commits)
  -> administrator and developer dashboard domains (minimum 30 commits)
  -> final verification and legacy-folder deletion (minimum 8 commits)
```

These phase floors total 144 qualifying migration commits, giving a small safety margin over the required 140. The detailed implementation plan will map each count to a real source-and-test, source-and-consumer, or source-and-configuration unit. Documentation-only commits, the design and plan commits, merge commits, and any commit that changes fewer than two non-empty files do not count toward the floor.

The foundation phase establishes aliases, public-slice exports, dependency checks, and test discovery before feature code moves. Public/authentication flows migrate next because route guards and session wiring establish patterns used by later protected routes. Inspector and offline workflows then move as a bounded set because camera capture, local inference, inspection submission, history, and reporting share the inspection domain. Administrator and developer tooling migrate after the domain boundaries are proven, which limits risk around the current large dashboard modules. Existing root folders may shrink only as their contents are moved directly into final FSD slices; they are not retained as an architectural compatibility layer.

No legacy root ownership remains at completion: production code will not be owned by the former top-level `components/`, `pages/`, `hooks/`, `lib/`, `contexts/`, or `integrations/api/` directories. Existing code is either moved into a final FSD slice or deleted only when proven unused.

## Definition of done

The refactor is complete when all production frontend code belongs to an FSD layer and public slice API; route pages are composition-only; dependency direction and public import rules are automatically checked; no compatibility exports, legacy aliases, or obsolete root folders remain; no maintained production source file exceeds 600 non-blank lines; and typecheck, lint, production build, existing behavior tests, source-size checks, and critical end-to-end journeys pass with no intentional UI or UX changes. The final migration audit confirms at least 140 qualifying commits, each modifying at least two non-empty files and representing a meaningful, independently verified change.
