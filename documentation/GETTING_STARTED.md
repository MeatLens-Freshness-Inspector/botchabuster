# Getting started

## Prerequisites

- Node.js 22.x (the supported runtime range is >=22 <25).
- npm 9 or newer.
- A Supabase project with PostgreSQL, Auth, and Storage enabled.
- Git.

## Install

```bash
git clone <repository-url>
cd botchabuster
npm install
```

The root package is an npm workspace for `frontend` and `backend`; install once from the repository root.

## Configure the backend

```powershell
Copy-Item backend/.env.example backend/.env
```

Set at least:

```env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-server-only-service-role-key
SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
APP_SESSION_SECRET=use-a-long-random-value
AUDIT_LOG_KEY=64-hex-characters-or-base64-for-32-bytes
ALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080,https://localhost,capacitor://localhost,http://localhost
UPLOAD_DIR=./uploads
```

For password-reset email, also configure `SMTP_USER` and `SMTP_PASS`. Developer dashboard flows require `DEVELOPER_OPTIONS_PASSWORD`; the token secret and TTL are optional overrides. Keep all of these values server-side.

## Configure the frontend

```powershell
Copy-Item frontend/.env.example frontend/.env
```

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

The frontend does not need the Supabase service key.

For Android Capacitor builds, the WebView origin is `https://localhost`. Keep that
origin in the backend allowlist so API requests with the native bearer token can
complete their CORS preflight.

## Database and storage

Apply every file in `backend/supabase/migrations/` in filename order using the Supabase migration workflow. Do not edit an existing applied migration; add a new timestamped migration for future schema or index changes.

Create the storage buckets and policies defined by the migrations before testing uploads. The backend creates its local `UPLOAD_DIR` staging directory automatically.

## Run locally

Start both workspaces:

```bash
npm run dev
```

Or start them independently:

```bash
npm run dev:backend
npm run dev:frontend
```

The default URLs are:

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3001`
- Health check: `http://localhost:3001/api/analysis/health`

## Verify the installation

```bash
npm run typecheck -w backend
npm run test -w backend
npm run build -w backend
npm run typecheck -w frontend
```

For the full monorepo fast suite:

```bash
npm run test:fast
```

## First workflow

1. Open the frontend and create an account with a valid access code.
2. Sign in; the backend establishes the application session and CSRF transport.
3. Capture or select an image and run the client-side MobileNetV3 analysis.
4. Upload and save the inspection record.
5. Use an admin/developer account to inspect role-aware dashboards and audit data.

## Troubleshooting

### Backend reports a missing environment variable

Confirm `backend/.env` exists and contains `SUPABASE_URL`, both Supabase keys, `APP_SESSION_SECRET`, and a valid `AUDIT_LOG_KEY`. Restart the backend after editing `.env`.

### Browser requests fail with an origin or CSRF error

Add the exact frontend origin to `ALLOWED_ORIGINS`, restart the backend, and use the frontend’s credentialed request client so it sends the current `X-CSRF-Token`.

### Uploads fail locally

Check that `UPLOAD_DIR` is writable and that the multipart field is named `image` for inspection uploads or `package` for developer training-run imports.

### Android shows “Failed to fetch”

The Capacitor client records the last 25 API transport failures in Android Logcat and in session storage. The records include the sanitized endpoint, HTTP method, app origin, native platform, online state, and either the network error or HTTP status; authorization headers, query strings, and request bodies are not recorded.

With the Android device connected, clear the old log, reproduce the failure, and filter for the client marker:

```powershell
adb logcat -c
adb logcat -v time | Select-String -Pattern "MeatLens|chromium|Capacitor"
```

In Android Studio, use the Logcat panel with the same device selected and search for `MeatLens][API`. A browser inspection session can also read the retained records from the WebView console with:

```js
JSON.parse(sessionStorage.getItem("meatlens-api-transport-diagnostics") || "[]")
```

For a CORS failure, the useful record will show `stage=network-error`, `errorMessage=Failed to fetch`, `platform=android`, and `appOrigin=https://localhost`. Rebuild and reinstall the APK after frontend changes, and redeploy the backend after CORS changes.

See [Architecture](ARCHITECTURE.md), [API reference](API_REFERENCE.md), and [Security](SECURITY.md) for the corresponding runtime rules.
