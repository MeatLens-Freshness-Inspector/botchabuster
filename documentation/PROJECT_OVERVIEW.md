# MeatLens project overview

MeatLens is an AI-assisted meat-freshness inspection system for wet-market workflows. Inspectors capture an image, receive computer-vision decision support, and save a traceable inspection record. Administrators manage users, access codes, markets, audit events, and aggregate reporting; developers manage datasets and training artifacts.

## Product capabilities

- Client-side MobileNetV3 ONNX inference for freshness decision support.
- Authenticated inspection capture, upload, classification, and history.
- Role-aware administration for inspectors, admins, and developers.
- Access-code onboarding and market-location management.
- Encrypted audit events and user-to-user chat.
- Developer dataset export, manual classification, and training-run import.
- Offline-friendly frontend workflows backed by explicit sync boundaries.

## Technology

| Area | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind, Capacitor, ONNX Runtime Web |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL through Supabase |
| Auth | Supabase Auth plus an application-signed session cookie |
| Storage | Supabase Storage and bounded local upload staging |
| Testing | Node test runner/tsx, Vitest-compatible frontend tests, Playwright |
| Deployment | Netlify frontend, Render backend, Supabase managed services |

No Redis, Grafana, queue, cache server, or external metrics stack is part of the supported deployment.

## Repository map

```text
botchabuster/
├── backend/
│   ├── src/
│   │   ├── bootstrap/       # dependency and route composition
│   │   ├── modules/         # bounded contexts: auth, users, inspections, ...
│   │   ├── middleware/      # cross-cutting HTTP/security middleware
│   │   ├── config/          # validated environment and runtime policy
│   │   ├── integrations/    # Supabase and external adapters
│   │   ├── shared/          # reusable application/domain/HTTP primitives
│   │   └── types/           # shared transport and domain types
│   ├── supabase/migrations/ # append-only database migrations
│   └── tests/               # unit, integration, and architecture tests
├── frontend/               # React/Vite web and Capacitor client
├── documentation/          # this documentation set
└── scripts/                # monorepo build and model-preflight scripts
```

## Backend modules

Each module exposes an `index.ts` composition surface and follows:

```text
presentation (routes/controllers/views)
        ↓
application (one-operation use cases)
        ↓
domain (entities/value objects/ports)
        ↓
infrastructure (Supabase, storage, email, or other adapters)
```

Current bounded contexts are:

- `auth` — credentials, passkeys, sessions, CSRF, email, and cookie policy.
- `users` — profiles, roles, administration, and user statistics.
- `inspections` — inspection CRUD, access scope, and inspection statistics.
- `analysis` — image upload and the retired server-analysis endpoint.
- `access-codes` — onboarding code lifecycle.
- `markets` — market-location administration.
- `analytics` — landing-page and aggregate reporting queries.
- `audit` — encrypted audit-log persistence.
- `chat` — assistant chat and user-to-user conversations.
- `developer` — datasets, training runs, unlock tokens, and developer options.

## Backend route namespaces

The application mounts the module routers through `backend/src/bootstrap/routes.ts`:

`/api/auth`, `/api/analysis`, `/api/upload`, `/api/profiles`, `/api/inspections`, `/api/access-codes`, `/api/stats`, `/api/chat`, `/api/user-chat`, `/api/market-locations`, `/api/audit-logs`, `/api/developer-options`, and `/api/developer-dashboard`.

See [API_REFERENCE.md](API_REFERENCE.md) for the route-level summary.

## Database and scaling posture

Supabase is used as the only database service. High-volume reads use explicit projections, deterministic ordering, bounded limits, indexes, and aggregate RPCs. New database changes are forward-only migration files; existing migrations are never edited. The design targets roughly 1,000–2,000 simultaneous users without introducing a separate cache or queue.

## Development commands

From the repository root:

```bash
npm install
npm run dev
npm run build
npm run test:fast
```

Backend-only checks:

```bash
npm run typecheck -w backend
npm run test -w backend
npm run build -w backend
```
