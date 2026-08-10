# Frontend documentation

## Overview

The frontend is a React 18 + TypeScript application built with Vite. It runs in the browser and through Capacitor, performs MobileNetV3 ONNX inference locally, and communicates with the Express backend through typed API clients.

## Source layout

```text
frontend/src/
├── components/       # reusable UI and security-aware controls
├── pages/            # route-level screens and workflows
├── contexts/         # auth, inspection, and application state
├── hooks/            # reusable state/effect hooks
├── integrations/     # backend API clients and Supabase/Capacitor adapters
├── lib/              # model, offline, developer-option, and transport helpers
├── types/            # frontend transport/domain types
└── App.tsx           # root router and providers
```

The client does not contain the Supabase service key. Browser requests use `VITE_API_BASE_URL`, credentialed cookies, and the CSRF token returned by the backend auth bootstrap. Native clients may use the bearer-token transport.

## Local development

```bash
npm install
Copy-Item frontend/.env.example frontend/.env
npm run dev -w frontend
```

Set:

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

The default Vite URL is `http://localhost:8080`.

## Model pipeline

The frontend build runs `scripts/sync-onnx-model.mjs` and `scripts/check-netlify-preflight.mjs`. These steps ensure that the MobileNetV3 ONNX artifact and metadata are available under `frontend/public/model` before deployment.

The inspection flow is:

```text
capture/select image
  → crop and resize
  → MobileNetV3 ONNX inference
  → freshness score and recommendation
  → authenticated image upload
  → inspection record persistence
```

The backend remains the source of truth for users, roles, inspections, audit data, and server-side policy checks.

## API Docs workspace

Developer accounts have an API Docs tab in the developer settings workspace. Its typed catalog mirrors the registered backend operations across authentication, analysis, access codes, inspections, profiles, statistics, uploads, chat, markets, audit logs, developer options, developer dashboard, and user chat.

When a backend route changes, update the catalog at:

```text
frontend/src/pages/admin-dashboard/components/developer/api-docs/catalog.ts
```

Keep its route-audit test synchronized. The editor must not expose authorization or CSRF secrets in cURL/history output.

## Commands

```bash
npm run dev -w frontend
npm run build -w frontend
npm run typecheck -w frontend
npm run test:unit -w frontend
npm run test:component -w frontend
npm run test:integration -w frontend
npm run test:e2e:critical -w frontend
```

The frontend `pretest` hook builds the backend first so integration and end-to-end tests exercise the current API contract.

## Deployment

Netlify uses the root `netlify.toml`, builds from `frontend/`, publishes `dist`, and rewrites SPA routes to `index.html`. Configure only:

```env
VITE_API_BASE_URL=https://your-render-service.onrender.com/api
```

See [Deployment](../DEPLOYMENT.md), [API reference](../API_REFERENCE.md), and [Security](../SECURITY.md) for cross-stack behavior.
