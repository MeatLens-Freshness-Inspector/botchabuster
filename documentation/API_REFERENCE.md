# API reference

The backend mounts these routers under `/api`. Unless noted otherwise, protected operations accept either the `meatlens_session` cookie or `Authorization: Bearer <token>`.

| Namespace | Representative operations | Access |
| --- | --- | --- |
| `/auth` | `POST /sign-in`, `POST /sign-up`, `GET /session`, passkey options/verification, password recovery | Sign-in/sign-up/reset are public and rate-limited; account mutations require self-authentication |
| `/analysis` | `POST /analyze`, `GET /health` | Health is public; analysis upload is multipart and bounded |
| `/upload` | `POST /inspection-image` | Authenticated multipart upload |
| `/profiles` | profile read/update, admin users, roles, stats | Self or admin; administration requires admin role |
| `/inspections` | list, `GET /:id`, create, delete, stats | Authenticated; records are scoped to the actor unless admin/developer access is granted |
| `/access-codes` | list, create, validate, delete, toggle | Admin-only lifecycle operations |
| `/stats` | `GET /landing-page` | Public aggregate landing statistics |
| `/chat` | assistant chat | Authenticated and rate-limited per user |
| `/user-chat` | contacts, conversation messages, send message | Authenticated; contacts are role-aware and bounded |
| `/market-locations` | list, create, delete | Admin operations for mutations |
| `/audit-logs` | list, create | Authenticated audit operations; writes are encrypted |
| `/developer-options` | unlock and verify | Developer option policy |
| `/developer-dashboard` | overview, datasets, exports, classifications, training runs/import | Developer-only |
| `/model-accuracy` | `GET /history`, `POST /versions`, `POST /snapshots` | History is authenticated; registration and capture are developer-only |

## Common request rules

- JSON bodies are parsed by Express and malformed JSON returns a JSON `400` response.
- Multipart image uploads are limited by the configured backend upload policy (10 MB maximum by default).
- Unsafe cookie-authenticated requests (`POST`, `PUT`, `PATCH`, `DELETE`) require a valid `X-CSRF-Token` and an allowed `Origin`.
- Public auth and chat endpoints are rate-limited in-process. The implementation does not require Redis.
- Unexpected failures are serialized without internal stack traces or database details.

## Historical model accuracy

Register a model version before deploying it:

- `POST /api/model-accuracy/versions` with `{ "versionKey", "displayName", "expectedAccuracy", "activeFrom" }`.
- `GET /api/model-accuracy/history?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` returns ordered daily snapshots.
- `POST /api/model-accuracy/snapshots` optionally accepts `{ "snapshotDate": "YYYY-MM-DD" }` for a previous-day capture or controlled backfill.

Expected accuracy is immutable for a version key. A changed model or benchmark gets a new version key. New inspection submissions carry the deployed key; the backend resolves it to the registered model-version foreign key. Legacy inspections without a key remain valid and are not attributed retroactively.

The scheduled job runs at `00:10 UTC` and captures the previous UTC calendar day. Observed accuracy uses only inspections with a non-null `official_classification`; it is null when no officially labeled inspections were evaluated. Snapshot writes are append-only and idempotent per model version and date.

## Developer dataset exports

The progress-aware export lifecycle is:

- `POST /api/developer-dashboard/datasets/export/start` starts an owner-scoped in-process export session and returns an `exportId`.
- `GET /api/developer-dashboard/datasets/export/:exportId/progress` returns the current stage and `{ current, total }` progress.
- `GET /api/developer-dashboard/datasets/export/:exportId/download` returns the completed ZIP and releases the session.

The legacy `POST /api/developer-dashboard/datasets/export` service path remains available internally. Both paths keep the submitted filters, start from the first matching row, and cap one export at 10,000 records. The export query selects only the CSV/manifest fields and does not perform an exact-count query. Progress sessions are temporary in-process state and are lost if the backend process restarts.

Every stored `image_url` is downloaded into the ZIP with bounded concurrency and retries. If an existing image cannot be downloaded after retries, the request fails with the affected inspection IDs instead of returning a partial dataset. Rows without an image URL remain valid rows and are listed in `manifest.json`; downloaded image bytes are stored without ZIP recompression.

## Health check

```bash
curl http://localhost:3001/api/analysis/health
```

Expected response:

```json
{ "status": "ok" }
```

## Route authority

The source of truth is `backend/src/bootstrap/routes.ts` plus the route files under `backend/src/modules/*/presentation`. Keep this page synchronized with those files and the backend integration/contract tests.
