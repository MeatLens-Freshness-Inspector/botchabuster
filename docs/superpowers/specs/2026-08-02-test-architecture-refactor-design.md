# Test Architecture Refactor Design

## Status

Approved on August 2, 2026. This design supersedes the narrower workspace-local test structure plan in [2026-07-20-test-structure-design.md](/C:/Users/Adriaan%20M.%20Dimate/Desktop/development/school/botchabuster/.worktrees/feat/test-architecture-refactor/docs/superpowers/specs/2026-07-20-test-structure-design.md) for the parts of the repository covered here.

## Goal

Refactor the BotchaBuster test suite into a layered architecture that matches the modular structure of the main codebase, keeps responsibilities explicit, and prevents either backend tests or Playwright tests from becoming flat dumping grounds.

## Scope

This migration covers:

- Root-level shared test assets, contract tests, smoke tests, and fixtures.
- Backend test architecture, support modules, setup, app factory extraction, and targeted external-system seams that directly improve testability.
- Frontend test architecture across unit, component, integration, end-to-end, and Playwright support layers.
- Test scripts, generated-artifact ignore rules, and CI lane separation for fast, critical, and slower suites.

This migration does not cover:

- Android native test layout changes.
- A full model-accuracy evaluation pipeline.
- Rewriting otherwise-useful tests purely for style once they are in the correct layer.

## Constraints

- The repository must remain runnable after each migration slice.
- Existing behavior and coverage should be preserved while files move.
- The work will happen in a dedicated git worktree and be delivered as many small commits rather than one monolithic change.
- Playwright should only cover real user journeys or browser-specific regressions by the end of the migration.
- New abstractions are allowed only when they solve a concrete test architecture or dependency-boundary problem.

## Current Problems

- `backend/tests/unit` and `backend/tests/integration` are flat directories with mixed business domains.
- `frontend/tests/unit` is a flat directory with domain logic, hooks, utilities, stateful rendering, and UI behavior all mixed together.
- `frontend/tests/e2e` contains both real user journeys and tests that belong in unit, component, or integration layers.
- Backend integration tests are coupled to the current server entry shape instead of a dedicated in-memory app factory.
- Shared fixtures, factories, and deterministic clocks are not centralized enough, which increases local setup duplication.
- CI currently treats test execution in a few broad buckets rather than reflecting architectural layers and feedback speed.

## Target Architecture

```text
botchabuster/
|-- tests/
|   |-- contracts/
|   |   |-- schemas/
|   |   |   |-- analysis-response.schema.ts
|   |   |   |-- inspection.schema.ts
|   |   |   `-- error-response.schema.ts
|   |   `-- api-contract.test.ts
|   |-- smoke/
|   |   |-- production-health.spec.ts
|   |   `-- critical-route.spec.ts
|   `-- fixtures/
|       |-- images/
|       |   |-- valid/
|       |   |-- invalid/
|       |   `-- edge-cases/
|       `-- payloads/
|-- backend/
|   |-- src/
|   `-- tests/
|       |-- unit/
|       |   |-- auth/
|       |   |-- inspections/
|       |   |-- analysis/
|       |   |-- reports/
|       |   |-- developer/
|       |   `-- shared/
|       |-- integration/
|       |   |-- auth/
|       |   |-- inspections/
|       |   |-- analysis/
|       |   |-- admin/
|       |   |-- developer/
|       |   `-- security/
|       |-- infrastructure/
|       |   |-- supabase/
|       |   |-- storage/
|       |   |-- email/
|       |   `-- model-runtime/
|       |-- support/
|       |   |-- appFactory.ts
|       |   |-- authFactory.ts
|       |   |-- requestFactory.ts
|       |   |-- supabaseFake.ts
|       |   |-- modelFake.ts
|       |   `-- fixtures.ts
|       `-- setup/
|           |-- env.ts
|           `-- lifecycle.ts
|-- frontend/
|   |-- src/
|   `-- tests/
|       |-- unit/
|       |   |-- domain/
|       |   |   |-- analysis/
|       |   |   |-- inspections/
|       |   |   |-- auth/
|       |   |   `-- image-quality/
|       |   |-- hooks/
|       |   |-- utilities/
|       |   `-- state/
|       |-- component/
|       |   |-- analysis/
|       |   |-- inspections/
|       |   |-- auth/
|       |   `-- shared/
|       |-- integration/
|       |   |-- api/
|       |   |-- offline/
|       |   |-- camera/
|       |   `-- storage/
|       |-- e2e/
|       |   |-- journeys/
|       |   |   |-- inspector/
|       |   |   |-- administrator/
|       |   |   `-- developer/
|       |   |-- security/
|       |   |-- offline/
|       |   `-- smoke/
|       `-- support/
|           |-- fixtures/
|           |-- page-objects/
|           |-- api/
|           |-- auth/
|           `-- factories/
```

## Organization Rules

### Primary rule

Organize tests first by test level, then by business domain or behavior. No major test level should remain a large flat directory.

### Migration rule

Move first, improve second. Tests should be mechanically relocated before being rewritten unless they are clearly in the wrong layer or blocked by necessary support changes.

### Naming rule

Prefer behavior-based file names with explicit layer context as files are touched:

- `<subject>.<test-level>.test.ts`
- `<journey>.e2e.spec.ts`

Naming cleanup is a priority only after architectural placement is correct.

## Layer Responsibilities

### Root shared tests

- `tests/contracts` verifies application boundary agreements such as analysis response, inspection payload, error response, auth state, role names, labels, and pagination shapes.
- `tests/smoke` holds high-value route or environment checks that do not belong to a single workspace.
- `tests/fixtures` holds curated payloads and image fixtures that are intentionally small and stable.

### Backend unit tests

Backend unit tests cover pure logic or isolated service behavior such as:

- auth/session decisions
- csrf and cookie policy
- developer import/export logic
- report organization and formatting
- coordinate and pre-scan normalization

They must not start Express, call Supabase, hit storage, use the real model runtime, or send real email.

### Backend integration tests

Backend integration tests create an in-memory Express app and verify request-to-response behavior such as:

- cookie and bearer propagation
- csrf enforcement
- role restrictions
- status codes and error shapes
- security headers
- request validation and rate limiting

### Backend infrastructure tests

Infrastructure tests cover runtime-specific or external-boundary behavior that is neither pure unit logic nor normal HTTP flow, such as repository adapters, storage adapters, model-runtime compatibility, and email template delivery seams. These suites should run separately from the fastest local feedback loop.

### Frontend unit tests

Frontend unit tests cover domain transforms, hook behavior with mocked dependencies, reducers/stores, validation logic, URL sanitization, offline decision rules, and image-quality logic without requiring a real browser.

### Frontend component tests

Frontend component tests verify isolated rendering, interaction, accessibility, and state transitions for UI pieces with mocked state or API dependencies.

### Frontend integration tests

Frontend integration tests cover application-internal boundaries such as hook-to-client behavior, offline queue to storage behavior, camera capture to preprocessing behavior, and state synchronization.

### Frontend end-to-end tests

Playwright is reserved for complete user-visible journeys and a very small number of browser-specific regressions. Tests currently sitting in Playwright but validating pure logic, client wrappers, or isolated component behavior should be moved downward into lighter layers.

## Backend Runtime Design

### App factory split

Create `backend/src/app.ts` as the test-safe Express app factory. Keep `backend/src/server.ts` as the production-only entry point that listens on a network port.

Integration tests should import the app factory rather than a module that immediately starts listening.

### Narrow seams for external systems

Introduce interfaces only where they improve test architecture materially, such as:

- `InspectionRepository`
- `ModelGateway`
- `ImageStorage`
- `Clock`

Production code continues to use real adapters. Tests should prefer focused fakes over broad module mocking.

### Backend test support

Centralize reusable helpers under `backend/tests/support` and `backend/tests/setup`, including:

- deterministic fixtures and factories
- fixed clocks
- app creation helpers
- auth/session request helpers
- fake repositories and gateways where needed

## Frontend Test Design

### Directory split

Reorganize frontend tests into:

- `tests/unit/domain`
- `tests/unit/hooks`
- `tests/unit/utilities`
- `tests/unit/state`
- `tests/component`
- `tests/integration`
- `tests/e2e`
- `tests/support`

### Playwright support architecture

Move reusable Playwright helpers out of `frontend/tests/e2e/support` into `frontend/tests/support`, then group them into:

- `fixtures`
- `page-objects`
- `api`
- `auth`
- `factories`

Keep page objects thin and focused on stable user actions and accessible locators.

### Playwright reduction plan

Move existing Playwright tests down when they belong in lighter layers. Examples include:

- result-card UI checks to component tests
- client wrapper behavior to frontend integration tests
- image-quality and URL-sanitization logic to unit tests, with only minimal end-to-end regressions retained where truly valuable

The resulting E2E suite should focus on inspector, administrator, and developer journeys plus offline/security/smoke coverage.

## Contracts and Fixtures

### Contract-first shared shapes

Start with shared schemas for:

- analysis responses
- inspection payloads or responses
- error responses

Contract tests should fail when either side changes a field or meaning without updating the shared contract.

### Deterministic fixtures

Adopt curated image and payload fixtures with fixed intent and documented purpose. Use stable identifiers and fixed dates in factories. Avoid randomized test data except for reproducible property-based cases.

## Scripts and CI

### Script strategy

Preserve existing useful scripts, then extend them with more explicit layers where needed, such as:

- `test:fast`
- `test:backend:integration`
- `test:infrastructure`
- `test:contract`
- `test:e2e:critical`
- `test:e2e:full`
- `test:ci`

Implement them with the repository's actual npm workspace commands rather than introducing a new toolchain.

### CI lane split

Pull requests should favor fast feedback:

- lint-and-types
- backend-unit
- frontend-unit
- backend-integration
- contract-tests
- build
- e2e-critical

Nightly or manual lanes should cover:

- full Playwright
- infrastructure tests
- real adapter suites where applicable
- model-runtime contract checks
- accessibility or extended validation lanes if already supported

## Implementation Plan

The migration should proceed in small verified slices:

1. Ignore generated Playwright output and scaffold root shared test directories.
2. Reorganize backend tests by domain under existing unit/integration layers.
3. Split frontend unit tests into domain, hooks, utilities, and state.
4. Add frontend component and integration layers and move misplaced low-level tests out of Playwright.
5. Reorganize frontend E2E into journeys, security, offline, and smoke, and move shared Playwright support into `frontend/tests/support`.
6. Extract `backend/src/app.ts` and keep `server.ts` production-only.
7. Add backend support/setup/fakes/factories and deterministic fixtures where repeated setup currently exists.
8. Add root contract tests and initial shared schemas.
9. Extend scripts and CI into fast, critical, and slower/manual lanes.
10. Finish with docs and full verification.

Each slice must leave the repo runnable and attributable. When a failure appears, it should be possible to tell whether it came from a move, a dependency-seam change, or a contract update.

## Verification Strategy

After each slice, run the narrowest relevant suites first, then periodically rerun the broader fast suites:

- frontend unit tests after frontend unit or component moves
- backend unit tests after backend unit/support changes
- backend integration tests after app factory or auth/request changes
- contract tests after schema additions
- critical E2E after Playwright regrouping

Before declaring the migration complete, verify at minimum that the fast suites pass in the worktree and that the new architectural scripts resolve correctly.

## Risks and Mitigations

### Risk: import-path churn during moves

Mitigation: perform mechanical directory changes in small batches and run the narrowest affected suite immediately after each batch.

### Risk: app-factory extraction changes runtime behavior

Mitigation: keep the first app-factory pass minimal and preserve existing middleware/router composition while switching only the entry shape.

### Risk: Playwright tests lose coverage when moved down

Mitigation: move tests downward incrementally and preserve assertions unless the layer change requires a lighter harness rewrite.

### Risk: CI script drift from local commands

Mitigation: implement CI around workspace scripts that are also runnable locally.

## Acceptance Criteria

The migration is complete when:

- no major test directory is a flat dumping ground
- backend integration tests use an in-memory app entry
- production listening stays in `server.ts`
- useful shared test factories and deterministic fixtures exist
- contract tests exist for high-risk shared boundary shapes
- Playwright primarily covers real journeys and browser-specific regressions
- generated test artifacts are ignored by Git
- scripts and CI reflect the new layers and feedback speeds
- existing behavior remains covered during the migration
