# Test Structure Migration Design

## Goal

Replace the repository's mixed, flat test folders with workspace-local, test-type-specific structures. Make every test level directly runnable through documented npm scripts.

## Scope

The migration covers the existing frontend Playwright tests, frontend Node/TSX unit tests, and backend Node tests. Android's conventional `android/app/src/test` layout is out of scope.

## Target layout

```text
frontend/
  tests/
    e2e/
      support/
    unit/

backend/
  tests/
    unit/
    integration/
```

- `frontend/tests/e2e` contains Playwright browser flows.
- `frontend/tests/e2e/support` contains reusable Playwright helpers.
- `frontend/tests/unit` contains Node/TSX unit tests for frontend code.
- `backend/tests/unit` contains isolated service, configuration, type, and utility tests.
- `backend/tests/integration` contains tests that create an Express app or exercise HTTP/route behavior.

## Test commands

Each workspace exposes a complete `test` script plus focused commands:

- Frontend: `test`, `test:unit`, `test:e2e`, and `test:e2e:ui`.
- Backend: `test`, `test:unit`, and `test:integration`.
- Root: `test` runs the frontend and backend workspace suites in sequence; focused root scripts delegate to the appropriate workspace suites.

Frontend Node/TSX tests use the existing Node test API through `tsx --test`. `tsx` is declared directly in the frontend development dependencies, so its test command does not depend on backend dependency hoisting. Playwright continues to use its existing configuration, updated only for the new E2E directory.

## Migration rules

1. Preserve every test's assertions and runtime behavior; only paths, imports, and scripts change.
2. Update all relative imports after file moves, including file-URL references used by source-layout tests.
3. Move Playwright support modules with their E2E consumers and update their relative imports.
4. Keep the frontend and backend test suites fully workspace-local.
5. Do not introduce a new test framework or change Android tests.

## Verification

After migration, run each workspace's focused suites and complete suite, then the root `npm test`. The checks must demonstrate that Playwright discovers the relocated E2E specs and Node discovers the relocated TypeScript/TSX tests.
