# Deployment Guide

This repo is a monorepo with:

- `frontend/` for the Netlify deploy
- `backend/` for the Render deploy

The deployment config is already committed in:

- `netlify.toml`
- `render.yaml`

## Recommended Order

Use this order so the frontend URL and backend CORS settings line up cleanly:

1. Create the Netlify site first so you know its final domain.
2. Create the Render backend and set `ALLOWED_ORIGINS` to that Netlify domain.
3. Set `VITE_API_BASE_URL` in Netlify to the Render backend URL, then redeploy the frontend.

## Frontend on Netlify

### What Netlify Uses

The root `netlify.toml` tells Netlify to:

- build from `frontend/`
- run `npm run build`
- publish `frontend/dist`
- rewrite all SPA routes to `/index.html`

### Netlify Setup

1. Push this repo to GitHub.
2. In Netlify, choose **Add new project** and connect the same repo.
3. If Netlify asks which app in the monorepo to use, select `frontend`.
4. Verify the build settings:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Before the final deploy, add this environment variable:
   - `VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`
6. Deploy the site.

### Netlify Model Preflight (Required)

Before deploying, make sure the MobileNetV3 ONNX artifacts exist in the repo:

- `model/meatlens_mobilenetv3small_cnn_only.onnx` (or `model/meatlens_mobilenetv3small_cnn_only (1).onnx`)
- metadata JSON with:
  - `backbone: MobileNetV3Small`
  - `preprocess_function_name: mobilenet_v3.preprocess_input`
  - `label_order: ["fresh", "not fresh", "spoiled"]`

During `npm run build`, `scripts/sync-onnx-model.mjs` copies these to stable public paths:

- `frontend/public/model/meatlens_mobilenetv3small_cnn_only.onnx`
- `frontend/public/models/mobilenetv3_meat/meatlens_mobilenetv3small_cnn_only.onnx`
- `frontend/public/model/meatlens_best_model_metadata.json`
- `frontend/public/models/mobilenetv3_meat/meatlens_best_model_metadata.json`

Build now also runs `scripts/check-netlify-preflight.mjs` on Netlify to fail fast when:

- `VITE_API_BASE_URL` is missing
- MobileNetV3 ONNX file is missing
- metadata JSON is missing

### Netlify Environment Variables

Copy from `frontend/.env.example`:

```env
VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com/api
```

## Backend on Render

### What Render Uses

The root `render.yaml` tells Render to:

- create one Node web service
- install from the repo root
- run `npm ci && npm run build`
- start with `npm run start`
- health check `GET /api/analysis/health`
- auto-deploy when backend or shared deploy files change

### Render Setup

1. In Render, choose **New +** then **Blueprint**.
2. Connect the same GitHub repo.
3. Render will read `render.yaml` and create the backend service from the repo root while only building the backend app.
4. Provide these environment variables when prompted:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `APP_SESSION_SECRET`
   - `CSRF_TOKEN_SECRET`
   - `ALLOWED_ORIGINS`
5. Wait for the backend deploy to finish, then copy the Render URL.

### Render Environment Variables

Copy from `backend/.env.example`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-or-anon-key
APP_SESSION_SECRET=replace-with-a-long-random-secret
CSRF_TOKEN_SECRET=replace-with-a-second-long-random-secret
APP_SESSION_COOKIE_SECURE=true
ALLOWED_ORIGINS=https://your-site.netlify.app,https://*--your-site.netlify.app
UPLOAD_DIR=/tmp/meatlens-uploads
```

Notes:

- Do not force `NODE_ENV=production` on Render for this service. The build runs `tsc` and needs backend devDependencies available during `npm ci`.
- `APP_SESSION_COOKIE_SECURE=true` is required for cross-site cookie auth from Netlify to Render.
- `ALLOWED_ORIGINS` supports comma-separated values.
- Wildcards are supported, so `https://*--your-site.netlify.app` allows Netlify preview and branch deploys for the same site.
- Requests without an `Origin` header, such as health checks, are still allowed.

### Keeping the Render service awake

If your Render plan idles services after inactivity, a simple scheduled ping will keep the backend from spinning down.

- A GitHub Actions workflow has been added at [.github/workflows/keep-awake.yml](.github/workflows/keep-awake.yml) which pings the health endpoint every 5 minutes.
- To change the schedule or endpoint, edit that workflow or create a Render Scheduled Job via the Render dashboard or `render.yaml`.

#### Using cron-job.org

If you prefer the hosted service cron-job.org, add a scheduled HTTP job that pings the health endpoint:

- **URL:** https://meatlens-backend.onrender.com/api/analysis/health
- **Method:** GET
- **Schedule:** every 5 minutes (UI or cron expression: `*/5 * * * *`)
- **Timeout:** 10s (or the default)
- **Save & enable** the job.

Notes:

- Ensure the Render URL is publicly reachable from cron-job.org.
- If your health endpoint requires a secret token, put it in an HTTP header or a query param and do NOT commit the token to the repo; use the cron-job.org secret storage if available.
- If you already use the GitHub Actions workflow, you can keep both; either will prevent the service from idling.

Quick test (run locally):

```bash
curl -i https://meatlens-backend.onrender.com/api/analysis/health
```



## Monorepo Notes

You do not need to split this repository.

- Netlify deploys only `frontend/`
- Render deploys only `backend/`
- both providers can stay connected to the same GitHub repo

## Existing Render Service

If your Render backend service already exists and is not managed by Blueprint yet, update it to either:

- sync from the root `render.yaml`, or
- use these manual settings in the Render Dashboard:

```text
Root Directory: (leave blank)
Build Command: npm ci && npm run build
Start Command: npm run start
```

The repo root includes a Render-aware `npm run build` and `npm start`, so the backend can be deployed from this monorepo without trying to build the frontend on Render.

## First Production Wiring

After both services exist:

1. Copy the Render backend URL, for example `https://meatlens-backend.onrender.com`
2. In Netlify, set:
   - `VITE_API_BASE_URL=https://meatlens-backend.onrender.com/api`
3. In Render, set:
   - `ALLOWED_ORIGINS=https://your-site.netlify.app,https://*--your-site.netlify.app`
4. Trigger a fresh deploy on both services if needed.

## Quick Checks After Deployment

Run these checks in the browser after deployment:

1. Open the frontend Netlify URL.
2. Confirm login and API-backed pages load without CORS errors.
3. Open `https://YOUR-RENDER-SERVICE.onrender.com/api/analysis/health` and confirm the health endpoint responds.
4. Test a direct deep link in the frontend, such as `/login`, to confirm Netlify SPA routing works.

## Troubleshooting

### Frontend still points to localhost

`VITE_API_BASE_URL` is missing or still set to a local value in Netlify.

### Browser shows CORS errors

`ALLOWED_ORIGINS` in Render does not include your Netlify production URL or preview URL pattern.

### Netlify deep links return 404

Make sure Netlify is using the root `netlify.toml` so the SPA redirect rule is applied.

### Render health checks fail

Confirm `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set and that the service is using the health check path `/api/analysis/health`.

## Reference Docs

- [Netlify monorepos](https://docs.netlify.com/build/configure-builds/monorepos/)
- [Netlify redirects and rewrites](https://docs.netlify.com/routing/redirects/)
- [Render Blueprint YAML reference](https://render.com/docs/blueprint-spec)
- [Render health checks](https://render.com/docs/health-checks)
