# Testing Architecture

BotchaBuster tests are organized first by layer, then by business domain or workflow.

## Layers

- `backend/tests/unit`
  Pure backend business rules and configuration behavior.
- `backend/tests/integration`
  In-memory Express application tests for route, middleware, and controller flow.
- `backend/tests/infrastructure`
  Runtime and external-boundary checks such as ML output contracts.
- `backend/tests/support`
  Shared backend test factories, fakes, and server helpers.
- `backend/tests/setup`
  Shared backend test environment and lifecycle utilities.
- `frontend/tests/unit`
  Frontend domain logic, hooks, state, and utilities.
- `frontend/tests/component`
  Isolated rendering and interaction coverage for UI components.
- `frontend/tests/integration`
  Frontend boundary tests across API, offline, camera, and storage concerns.
- `frontend/tests/e2e`
  User-visible Playwright journeys grouped by `journeys`, `offline`, `security`, and `smoke`.
- `frontend/tests/support`
  Shared Playwright fixtures and factories.
- `tests/contracts`
  Cross-boundary API and data-shape contracts shared across frontend, backend, and ML-adjacent layers.
- `tests/fixtures`
  Shared repository-level fixture directories.

## Commands

- `npm run test:fast`
  Frontend unit/component/integration plus backend unit suites.
- `npm run test:backend:integration`
  Backend HTTP integration coverage.
- `npm run test:infrastructure`
  Backend infrastructure and model-runtime contract coverage.
- `npm run test:contract`
  Root cross-boundary contract coverage.
- `npm run test:e2e:critical`
  Pull-request Playwright smoke and critical journeys.
- `npm run test:e2e:full`
  Full Playwright suite.
- `npm run test:ci`
  Lint, typecheck, fast suites, backend integration, and contract tests.

## Notes

- Keep Playwright focused on complete workflows or browser-only behavior.
- Prefer adding coverage to unit, component, integration, infrastructure, or contract layers before adding a new E2E.
- Use shared helpers in `backend/tests/support` and `frontend/tests/support` instead of rebuilding fixtures inline.
