# Deployment guide

MeatLens is deployed as two application services backed by Supabase:

- Frontend: Netlify static hosting.
- Backend: Render Node web service.
- Database/Auth/Storage: Supabase managed project.

No Redis, Grafana, queue worker, or separate metrics service is required.

## Recommended order

1. Create the Netlify site and record its production/preview origins.
2. Create the Render backend and configure `ALLOWED_ORIGINS` with those origins.
3. Set Netlify’s `VITE_API_BASE_URL` to the Render `/api` URL.
4. Apply Supabase migrations and storage policies before exercising protected flows.

## Netlify frontend

The root `netlify.toml` uses `frontend/` as the base directory, runs `npm run build`, publishes `frontend/dist`, and rewrites SPA routes to `index.html`.

Configure:

```env
VITE_API_BASE_URL=https://your-render-service.onrender.com/api
```

The frontend build synchronizes and validates the MobileNetV3 ONNX artifact and metadata. A missing model or API base URL fails the preflight instead of producing a partial deployment.

## Render backend

`render.yaml` creates one Node web service with:

- build: `npm ci && npm run build`
- start: `npm run start`
- health check: `GET /api/analysis/health`
- upload staging: `/tmp/meatlens-uploads`

Configure these server-only values in Render:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
APP_SESSION_SECRET=<long-random-secret>
CSRF_TOKEN_SECRET=<different-long-random-secret>
AUDIT_LOG_KEY=<64-hex-characters-or-base64-for-32-bytes>
ALLOWED_ORIGINS=https://your-site.netlify.app,https://*--your-site.netlify.app
APP_SESSION_COOKIE_SECURE=true
UPLOAD_DIR=/tmp/meatlens-uploads
```

Optional values:

```env
APP_SESSION_TTL_SECONDS=28800
CSRF_TOKEN_TTL_SECONDS=900
APP_SESSION_COOKIE_NAME=meatlens_session
DEVELOPER_OPTIONS_PASSWORD=<strong-password>
DEVELOPER_OPTIONS_TOKEN_SECRET=<token-secret>
DEVELOPER_OPTIONS_TOKEN_TTL_SECONDS=21600
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-app-password>
```

Do not expose the service key, session secrets, audit key, SMTP password, or developer password to Netlify or browser code.

## Supabase release checklist

- Apply all migrations in `backend/supabase/migrations/` in lexical/timestamp order.
- Confirm RLS and storage policies are active.
- Confirm the query-support and bounded-chat migrations are present.
- Create/verify the inspection-image and developer artifact storage buckets.
- Validate Auth redirect URLs and the production frontend origin.

## Smoke checks

```bash
curl -i https://your-render-service.onrender.com/api/analysis/health
```

Then verify sign-in, cookie session bootstrap, a CSRF-protected mutation, an image upload, and one role-protected admin/developer route. Browser clients must use the credentialed cookie transport; native clients may use bearer tokens.

## CI and previews

The repository workflow is path-aware and keeps deployment independent of paid infrastructure. Every relevant change receives:

- least-privilege read-only checkout permissions;
- cancellation of superseded runs on the same branch or pull request;
- documentation validation, including required guides and local-link checks;
- backend unit, integration, architecture, contract, typecheck, and build gates;
- frontend unit, component, integration, and critical Playwright gates; and
- a final quality-gate job that summarizes all lanes and fails on any failure or cancellation.

Documentation-only changes run the documentation validator and skip the expensive application lanes. Scheduled and manual runs additionally execute infrastructure checks and the full Playwright suite. Keep preview deploy hooks optional; deployment does not depend on them. A hosted ping may be used to prevent an idle Render instance, but it is operational convenience rather than a backend dependency.
