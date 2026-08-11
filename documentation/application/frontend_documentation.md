# Frontend Documentation

## Overview

The frontend is a React 18 + TypeScript application built with Vite and packaged for browser and Capacitor environments. It performs MobileNetV3 ONNX inference locally, supports offline workflows, and communicates with the Express backend through typed clients.

The frontend has completed a full Feature-Sliced Design (FSD) migration. The migration is structural only: UI/UX behavior and visual presentation remain owned by the existing page, widget, feature, and shared UI implementations. There is no supported legacy frontend architecture.

For the complete tracked source/configuration inventory, see [Frontend folder structure](../frontend/folder-structure.md).

## Source layout

```text
frontend/src/
|-- app/       # composition, providers, layouts, routing, guards, global styles
|-- pages/     # route-level screens
|-- widgets/   # reusable page-scale compositions
|-- features/  # user-facing workflows and interactions
|-- entities/  # business concepts, API clients, caches, and domain types
|-- shared/    # reusable UI, platform adapters, transport, and utilities
|-- test/      # shared test setup
|-- main.tsx   # browser entry point
\-- vite-env.d.ts
```

### Layer responsibilities

- **app** composes the application and owns route registration, providers, layouts, guards, and global styles.
- **pages** represent route-level screens and assemble widgets and features for a route.
- **widgets** represent reusable page-scale sections or shells.
- **features** represent user intent and workflows, such as signing in, capturing an inspection, submitting analysis, editing a profile, or using developer tools.
- **entities** represent business concepts and their stable data contracts, including typed clients and cache adapters.
- **shared** contains generic UI primitives, transport/platform integrations, storage, and utilities that do not own product-specific behavior.

Use a slice's public `index.ts` when one exists. Do not import private implementation files across slices. The dependency direction is from application composition toward lower-level reusable slices; lower layers must not import pages or widgets.

## Security and transport

The client does not contain the Supabase service key. Browser requests use `VITE_API_BASE_URL`, credentialed cookies, and the CSRF token returned by the backend auth bootstrap. Native clients may use the bearer-token transport.

Keep credentials, authorization headers, CSRF tokens, and sensitive response data out of API Docs cURL/history output. Redaction behavior is covered by the developer-tools tests.

## Local development

```powershell
npm install
Copy-Item frontend/.env.example frontend/.env
npm run dev:frontend
```

Set:

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

The default Vite URL is `http://localhost:8080`.

## Model and offline pipeline

The frontend build synchronizes the ONNX model before Vite starts. The inspection flow is:

```text
capture/select image
  -> crop and resize
  -> local MobileNetV3 ONNX inference
  -> freshness score and recommendation
  -> authenticated image upload
  -> inspection record persistence
```

Offline analysis and sync are isolated in their owning features. The backend remains the source of truth for users, roles, inspections, audit data, and server-side policy checks.

## API Docs workspace

Developer accounts have an API Docs tab in the developer settings workspace. Its typed catalog is owned by:

```text
frontend/src/features/developer-tools/model/api-docs-catalog.ts
```

When a backend route changes, update that catalog and its route-audit tests. The editor must not expose authorization or CSRF secrets in cURL/history output.

## Verification commands

```powershell
# from the repository root
npm run typecheck -w frontend
npm run lint -w frontend
npm run test:unit -w frontend
npm run test:component -w frontend
npm run test:integration -w frontend
npm run test:architecture -w frontend
npm run build -w frontend
npm run test:e2e:critical -w frontend
npm run test:contract
```

The frontend `pretest` hook builds the backend first so integration and end-to-end tests exercise the current API contract. The repository-level contract suite checks auth bootstrap, inspection-list, error-envelope, and analysis-result schemas across both workspaces.

## Deployment

Netlify uses the root `netlify.toml`, builds from `frontend/`, publishes `dist`, and rewrites SPA routes to `index.html`. Configure only:

```env
VITE_API_BASE_URL=https://your-render-service.onrender.com/api
```

See [Deployment](../DEPLOYMENT.md), [API reference](../API_REFERENCE.md), and [Security](../SECURITY.md) for cross-stack behavior.
