# Frontend Feature-Sliced Refactor Design

## Goal

Refactor the MeatLens frontend into a scalable Feature-Sliced Design (FSD) architecture without changing its UI, UX, routes, copy, permissions, API contracts, native behavior, or existing user-facing functionality.

## Scope and invariants

- Preserve every current route URL, redirect, guard, permission rule, rendered experience, interaction, and API request/response contract.
- Preserve Capacitor camera, network, SQLite, passkey, offline synchronization, local inference, reporting, and administrator/developer workflows.
- Treat current unit, component, integration, and end-to-end tests as behavior contracts throughout the migration.
- Do not redesign components, change visual styling, alter content, introduce features, change the backend, or perform a big-bang rewrite.
- Migrate in independently releasable slices. A phase is complete only after its targeted validation passes and its compatibility boundary is explicit.

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

## Dependency rules

- `app` may import from every lower layer.
- `pages` may import from `widgets`, `features`, `entities`, and `shared`.
- `widgets` may import from `features`, `entities`, and `shared`.
- `features` may import from `entities` and `shared`.
- `entities` may import from `shared`.
- `shared` imports only external packages and other shared modules.
- Cross-slice imports use the exporting slice's `index.ts`; deep imports are prohibited outside the slice.
- A compatibility re-export may exist only while a documented migration phase has live consumers. It must be deleted in the cleanup phase.

The dependency rules will be checked through ESLint restricted-import rules and a focused architecture test or script, so violations fail local validation and CI instead of relying on convention.

## Test strategy

- Keep the current frontend test suite executable from the first migration commit onward.
- Enable the runner to discover both the existing top-level tests and colocated slice tests during the transition.
- Move unit and component tests with the slice they verify once that slice is stable. Keep cross-slice integration and Playwright end-to-end journeys in the shared `tests/` hierarchy.
- Add focused regression coverage whenever a large module is split, concentrating on public API compatibility, query/mutation behavior, offline persistence boundaries, route guards, and import-boundary rules.
- Validate each migration phase with typecheck, lint, targeted unit/component/integration tests, a production build, and the affected critical Playwright journey. The final phase runs the full frontend suite.

## Migration sequence

```text
Foundation
  -> shared transport and platform boundaries plus app shell
  -> public/authentication/session flows
  -> inspector, camera, offline analysis, history, and reports
  -> profile, messages, onboarding, tutorials, and assistant
  -> administrator and developer dashboard domains
  -> compatibility removal and legacy-folder deletion
```

The foundation phase establishes aliases, public-slice exports, dependency checks, and test discovery before feature code moves. Public/authentication flows migrate next because route guards and session wiring establish patterns used by later protected routes. Inspector and offline workflows then move as a bounded set because camera capture, local inference, inspection submission, history, and reporting share the inspection domain. Administrator and developer tooling migrate after the domain boundaries are proven, which limits risk around the current large dashboard modules.

No legacy root ownership remains at completion: production code will not be owned by the former top-level `components/`, `pages/`, `hooks/`, `lib/`, `contexts/`, or `integrations/api/` directories. Existing code is either moved into a final FSD slice or deleted only when proven unused.

## Definition of done

The refactor is complete when all production frontend code belongs to an FSD layer and public slice API; route pages are composition-only; dependency direction and public import rules are automatically checked; compatibility exports and obsolete root folders have been removed; and typecheck, lint, production build, existing behavior tests, and critical end-to-end journeys pass with no intentional UI or UX changes.
