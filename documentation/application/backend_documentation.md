# Backend documentation

## Runtime

The backend is a TypeScript Express application in `backend/`. It composes module routers in `src/bootstrap/routes.ts`, starts from `src/server.ts`, and serves the API under `/api`.

The backend has no top-level `routes`, `controllers`, `services`, or `models` compatibility directories. Feature code lives in bounded modules; cross-cutting HTTP concerns remain in `src/middleware`.

## Source layout

```text
backend/src/
├── app.ts                         # Express application composition
├── server.ts                       # process entry point
├── bootstrap/
│   ├── dependencies.ts             # dependency root
│   ├── modules.ts                  # module registry
│   └── routes.ts                   # API namespace mounting
├── modules/
│   └── <bounded-context>/
│       ├── domain/                 # ports, value objects, domain rules
│       ├── application/            # one-operation use cases
│       ├── infrastructure/        # Supabase/storage/email adapters
│       └── presentation/           # Express routes, controllers, views
├── middleware/                    # auth, CSRF, CORS, rate limit, uploads, errors
├── config/                        # environment and runtime policy
├── integrations/                  # Supabase client boundaries
├── shared/                        # reusable primitives and HTTP responses
└── types/                         # transport/domain types shared by modules
```

The MVC path is preserved inside every module:

```text
HTTP route → controller → application use case → infrastructure adapter → view/response
```

Application classes expose one public `execute` operation. Controllers translate HTTP input/output and do not query Supabase directly. Infrastructure owns persistence and uses explicit columns, bounded reads, deterministic ordering, and parameterized Supabase calls.

## Composition and middleware

`app.ts` applies security headers, origin rejection, CORS, JSON parsing, module routers, and the global error handler. `middleware/auth.ts` is a cross-cutting authentication adapter that uses auth and users module components; it is not a legacy service layer.

Feature routes use `upload.ts` for inspection images and `developerPackageUpload.ts` for training-run packages. `rateLimit.ts` provides bounded in-process request throttling for public auth and chat; it does not require Redis.

## Configuration

Copy `backend/.env.example` to `backend/.env`. Required runtime values are:

```env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=...
SUPABASE_PUBLISHABLE_KEY=...
APP_SESSION_SECRET=...
AUDIT_LOG_KEY=<64 hex characters or base64 for 32 bytes>
ALLOWED_ORIGINS=http://localhost:8080
```

Optional values include `CSRF_TOKEN_SECRET`, `CSRF_TOKEN_TTL_SECONDS`, `APP_SESSION_COOKIE_SECURE`, `APP_SESSION_COOKIE_NAME`, `UPLOAD_DIR`, developer-option secrets, and SMTP credentials for email flows. Never commit credentials or use the service key in browser code.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run build
```

The backend test command runs  unit, integration, and architecture suites. Architecture tests verify module boundaries, query shape, final-class conventions, router composition, and absence of the deleted legacy directories.

## Database and storage

Apply `backend/supabase/migrations/` in filename order using the project’s Supabase migration workflow. Migrations are append-only. The query-support migrations add indexes and aggregate RPCs for bounded inspection, session, passkey, audit, role, and chat workloads.

Supabase Storage holds inspection images and developer artifacts. Local `UPLOAD_DIR` is only a staging location for multipart uploads and temporary export/import work.

## API authority

The registered API is defined by module presentation routers and mounted by `src/bootstrap/routes.ts`. Use [API_REFERENCE.md](../API_REFERENCE.md) for the current namespace summary and [SECURITY.md](../SECURITY.md) for request-authentication rules.
