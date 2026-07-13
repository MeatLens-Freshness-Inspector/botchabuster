# Developer Dashboard Design

Date: 2026-07-13
Status: Approved for implementation

## Summary

Add a first-class `developer` role that behaves like an administrator for all existing privileged flows, while exposing one additional developer-only workspace inside the admin dashboard. That workspace is displayed as a top-level `Developer Settings` tab and contains four internal tabs: `Overview`, `Developer Settings`, `Datasets`, and `Training`.

The developer workspace is not a second admin dashboard. It reuses the existing admin shell, keeps all current admin tabs available to developers, and moves the current developer-options UI into a developer-only area. Training still happens outside the web app on another machine; the web app only imports and presents run results plus dataset export tools.

## Goals

- Introduce `developer` as a first-class application role in frontend and backend code.
- Treat developers as privileged users with all current admin powers.
- Keep regular admin behavior intact while hiding developer-only UI from non-developers.
- Replace the current top-level `Developer Options` admin tab with a developer-only `Developer Settings` workspace.
- Add developer dashboards for model metrics, dataset browsing/export, and imported training-run review.
- Avoid new relational schema work beyond the already-added role/policy SQL.

## Non-Goals

- Running model training jobs from the browser.
- Uploading or hosting model-weight binaries for deployment.
- Replacing the existing inspections admin tab with the developer dataset view.
- Redesigning unrelated admin dashboard areas.
- Introducing new SQL tables for training runs in v1.

## Existing System Context

The current codebase already contains the pieces this feature extends:

- The new Supabase role and policy migrations already exist in:
  - `backend/supabase/migrations/20260712000000_add_developer_role.sql`
  - `backend/supabase/migrations/20260712000001_update_developer_role_policies.sql`
- Backend auth still models privilege primarily as a single `isAdmin` boolean in:
  - `backend/src/middleware/auth.ts`
  - `backend/src/controllers/AuthController.ts`
- Existing privileged controllers rely on `authContext.isAdmin`, including:
  - `backend/src/controllers/AccessCodeController.ts`
  - `backend/src/controllers/DeveloperOptionsController.ts`
  - `backend/src/controllers/InspectionController.ts`
  - `backend/src/controllers/MarketLocationController.ts`
  - `backend/src/controllers/AuditLogController.ts`
- Frontend auth state still exposes `isAdmin` only in:
  - `frontend/src/contexts/AuthContext.tsx`
  - `frontend/src/integrations/api/AuthClient.ts`
- The admin dashboard currently exposes a top-level `Developer Options` tab through:
  - `frontend/src/pages/admin-dashboard/utils/adminDashboard.ts`
  - `frontend/src/pages/admin-dashboard/types.ts`
  - `frontend/src/pages/admin-dashboard/components/AdminDashboardDesktopPage.tsx`
  - `frontend/src/pages/admin-dashboard/components/AdminDashboardMobilePage.tsx`
- The current developer options UI already exists and is preserved in:
  - `frontend/src/components/DeveloperOptionsPanel.tsx`
  - `frontend/src/pages/admin-dashboard/desktop/components/DeveloperTab.tsx`
  - `frontend/src/pages/admin-dashboard/mobile/components/DeveloperTab.tsx`
- Inspection images are already stored in Supabase Storage through:
  - `backend/src/services/StorageService.ts`

## Approved Product Rules

The following rules were explicitly approved during design:

- Developers are admins, but not all admins are developers.
- Developers keep all current admin permissions and tabs.
- Developers get one extra top-level admin-dashboard tab.
- That extra top-level tab is labeled `Developer Settings`.
- Inside the developer workspace, the tabs are exactly:
  - `Overview`
  - `Developer Settings`
  - `Datasets`
  - `Training`
- `Overview` shows model metrics such as accuracy, precision, recall, and F1-score.
- `Datasets` shows all inspection records in a table and keeps images visible.
- `Datasets` supports full dataset export for external training.
- Dataset export format is a ZIP package with a manifest plus copied images.
- Training happens on a different machine, locally, not in the web app.
- `Training` uses imported run results rather than live training jobs.
- The current developer-options content must move into the internal `Developer Settings` tab.

## Architecture Overview

The approved design has three distinct layers:

1. Role resolution and privilege propagation
2. Developer-only admin workspace UI
3. Imported developer analytics and dataset tooling

### Layer 1: Role Resolution

The backend becomes the source of truth for four related fields:

- `roles`: the complete list of user roles from `user_roles`
- `primaryRole`: a single display/audit role
- `isAdmin`: `true` for both `admin` and `developer`
- `isDeveloper`: `true` only for `developer`

This preserves compatibility with existing admin-gated endpoints while enabling precise frontend visibility and developer-only backend endpoints.

### Layer 2: Developer Workspace

The existing admin dashboard shell remains the single privileged console for both admins and developers. Developers see one extra top-level tab, while regular admins never render or fetch developer workspace data.

### Layer 3: Imported Metrics And Dataset Tooling

Developer-specific analytics are split by ownership:

- `Overview` and `Training` use imported run-result packages
- `Datasets` uses live inspection records plus server-side export packaging
- `Developer Settings` reuses the existing developer-options flows

## Role And Auth Model

### Backend Role Rules

- `developer` must be resolved alongside `admin`, not treated as an opaque extra string.
- `isAdmin` must evaluate `true` when a user has either `admin` or `developer`.
- `isDeveloper` must evaluate `true` only when a user has `developer`.
- Auth and session bootstrap responses must include `roles`, `primaryRole`, `isAdmin`, and `isDeveloper`.
- Existing privileged endpoints continue checking `isAdmin` unless they are explicitly developer-only.
- New developer-dashboard endpoints must require `isDeveloper`.

### Frontend Role Rules

- Frontend auth state must expose `isDeveloper` in addition to `isAdmin`.
- Developers continue to pass all existing admin guards.
- Regular admins must never see the developer workspace tab or request its data.
- If the stored active admin tab points to the developer workspace for a non-developer user, the frontend must fail closed and redirect that user back to the standard admin overview tab.

### Audit Logging Rule

Developer actions must log the actor's actual role rather than hardcoding `"admin"`. This avoids collapsing developer actions into generic admin audit entries.

## Admin Dashboard Navigation Design

### Top-Level Tabs

Regular admins keep the existing admin dashboard tabs except that the old `Developer Options` top-level tab is removed.

Developers see the same admin tabs plus one additional top-level tab:

- `Developer Settings`

Internally, the existing `developer` tab key may remain in code to minimize churn, but the visible label must be `Developer Settings`.

### Internal Developer Workspace Tabs

Inside the developer workspace, the content is divided into four internal tabs:

1. `Overview`
2. `Developer Settings`
3. `Datasets`
4. `Training`

Desktop and mobile must share the same information architecture. The mobile experience may change the interaction pattern, such as using stacked controls or dropdown selectors, but not the available content or permissions.

### Loading Strategy

Developer workspace data must load lazily. The app must not fetch developer-only data during the default admin dashboard bootstrap.

Approved loading rules:

- Non-developers never request developer endpoints.
- Developers fetch developer workspace data only when the top-level developer tab is active.
- `Overview`, `Datasets`, and `Training` load on demand by internal tab, not all at once.
- The existing developer-options verification flow remains localized to the internal `Developer Settings` sub-tab.

This lazy-loading rule is required to avoid repeating the eager authenticated-request pattern that previously caused auth noise and sign-out regressions.

## Developer Overview

`Overview` is a read-only analytics surface for imported model-evaluation results.

### Purpose

Give developers a fast comparison view of the latest imported metrics for the main model families, especially MobileNetV2 and MobileNetV3, without exposing training controls in the browser.

### Required Content

- KPI cards for:
  - `accuracy`
  - `precision`
  - `recall`
  - `F1-score`
- Side-by-side comparison between the latest imported MobileNetV2 run and the latest imported MobileNetV3 run when both exist.
- Trend visualizations over imported runs where available.
- Empty states when no imported runs exist yet.

### Source Of Truth

`Overview` must not derive these metrics from inspection rows. It reads from imported run-result manifests only.

### Behavior Rules

- If both MobileNetV2 and MobileNetV3 runs exist, the overview highlights the newest run for each family.
- If only one family has imported runs, the page still renders that family cleanly and shows the other as unavailable.
- If no runs are imported, the page shows a clear empty state with guidance to use the `Training` tab to import results.

## Developer Settings Sub-Tab

The internal `Developer Settings` sub-tab is the new home of the current developer-options system.

### Scope

- Reuse the existing `DeveloperOptionsPanel`.
- Preserve the existing unlock-with-password behavior.
- Preserve the existing local flags and queue/snapshot tools.
- Restrict the entire sub-tab to developers only through the top-level workspace.

### Product Rule

Role-based access to the workspace does not remove the existing password unlock flow inside the panel. A developer must still unlock developer options before changing those debug flags.

## Datasets

`Datasets` is the training-data preparation view, not a duplicate of the current admin inspections list.

### Purpose

Expose the full inspection dataset in a denser, developer-oriented format with image visibility and export tooling for offline model training.

### Required Content

- Full inspection table with visible image thumbnails/previews
- Pagination
- Filters for date range, meat type, classification, inspector, location, and image presence
- Export controls
- Record counts and export feedback

### Data Source

The dataset view uses the existing inspections data model. It does not create a second copy of inspection data.

The frontend must not depend on the current admin dashboard preload of `inspectionClient.getAll(200, 0, "all")` for this tab. The dataset tab must request its own paginated inspection data so it can scale beyond the current 200-row bootstrap.

### Export Format

The approved dataset export format is a ZIP package containing:

- `manifest.json`
- `inspections.csv`
- copied image files for exported rows that have images

The primary export action packages the dataset rows matching the current filters. With the default filter state, that means the full dataset.

`manifest.json` must include at minimum:

- export timestamp
- applied filters
- total record count
- image count
- rows missing images

### Export Error Rules

- Missing or unreachable images must not fail the entire export.
- The export manifest must record which rows were skipped for missing images.
- The user must receive a successful export as long as the tabular data was generated, even if some images were unavailable.

## Training

`Training` is an import-and-review workspace for externally produced model runs.

### Purpose

Let developers bring evaluation results from a separate local training machine into the web app so those results can power the `Overview` dashboard and training history screens.

### V1 Interaction Model

- The web app does not start, stop, or schedule training jobs.
- The web app imports completed run-result packages.
- Imported runs are then listed, browsed, and compared inside the dashboard.

### Approved Import Package Contract

V1 uses a ZIP package with a required `manifest.json` file and optional artifact files.

The required manifest fields are:

- `runId`
- `createdAt`
- `modelFamily`
- `modelVariant`
- `modelVersion`
- `datasetName`
- `datasetRecordCount`
- `metrics.accuracy`
- `metrics.precision`
- `metrics.recall`
- `metrics.f1Score`

For v1 overview cards, `modelFamily` values of `mobilenetv2` and `mobilenetv3` are the highlighted comparison families. Other family strings may appear in training history, but they are not part of the top comparison cards.

Optional manifest fields may include:

- notes
- confusion-matrix summaries
- class-level metrics
- source machine label
- artifact descriptors

Optional ZIP contents may include:

- report images
- evaluation charts
- JSON summaries

Model-weight binaries are out of scope for this dashboard and are not part of the supported import contract in v1.

### Required Training UI Content

- Imported run history list
- Run detail view or detail surface
- Imported-at timestamp
- Model family and version metadata
- Dataset snapshot metadata from the manifest
- Metrics summary
- Artifact download/view actions when artifacts are present

## Backend API And Storage Design

### Existing Admin APIs

Current admin APIs continue to work for developers through the widened `isAdmin` semantics. This includes inspections, access codes, markets, logs, and similar privileged flows.

### New Developer API Namespace

Developer-specific functionality lives under a dedicated backend namespace rather than being bolted onto the existing developer-options endpoints.

Approved namespace:

- `/api/developer-dashboard/...`

The expected capability split is:

- `GET /api/developer-dashboard/overview`
- `GET /api/developer-dashboard/training-runs`
- `POST /api/developer-dashboard/training-runs/import`
- `POST /api/developer-dashboard/datasets/export`

The existing `/api/developer-options/...` endpoints remain focused on unlock and verification of the debug panel.

### Storage Strategy

No new relational schema is introduced for overview and training data in v1.

Imported training-run manifests and optional artifacts are persisted in Supabase Storage under a reserved developer prefix inside the existing storage system. The storage layout must be namespaced so it cannot collide with inspection image uploads.

Approved example layout:

- `developer/training-runs/<runId>/manifest.json`
- `developer/training-runs/<runId>/artifacts/...`

This is intentionally storage-backed rather than SQL-backed for v1 so the feature can ship using the already-approved role migration only.

### Dataset Export Generation

Dataset export packaging must happen server-side because the server already has the best access path to inspection data and image URLs. The browser must receive a ready-to-download ZIP, not assemble it locally.

## Error Handling And Security

### Authorization Rules

- Non-developers must receive authorization failure on developer-dashboard endpoints.
- Regular admins continue to work on existing admin endpoints.
- Developers continue to work on existing admin endpoints plus developer endpoints.

### Empty And Partial States

- Missing imported runs must produce empty-state UI, not broken charts.
- Partial import packages must fail with clear validation errors before being persisted.
- Partial dataset exports must succeed with manifest warnings when image retrieval is incomplete.

### Validation Rules

- Training import must reject packages that do not include a valid `manifest.json`.
- Training import must reject manifests missing any required metric fields.
- Training import must reject packages whose `runId` collides with an existing imported run. Replacement behavior is out of scope for v1.

### Audit Rules

The following actions must produce audit entries:

- developer-options unlock
- dataset export
- training-run import

Audit entries must identify the real actor role, including `developer`.

## Testing Strategy

### Backend

- Role-resolution tests covering `admin`, `developer`, mixed-role, and standard-user cases
- Auth/session response tests verifying `isAdmin` and `isDeveloper` propagation
- Authorization tests for new developer-dashboard endpoints
- Training import validation tests
- Dataset export packaging tests, including missing-image handling

### Frontend

- Auth-context tests verifying developer role propagation
- Dashboard navigation tests verifying:
  - admins do not see the developer workspace
  - developers do see it
  - non-developers cannot remain on a stale developer tab selection
- Developer workspace sub-tab tests for empty and populated states
- Existing developer-options tests updated for the new location

### Regression Focus

Because this code recently experienced authentication regressions, the implementation must treat request timing and role-gated fetching as explicit regression areas. The developer workspace must not trigger unauthorized requests for users who cannot access it.

## Rollout Notes

- The existing SQL migrations introducing `developer` and broadening RLS policies are assumed to be applied in Supabase before the feature is exercised.
- Users without the `developer` role must experience no new visible dashboard surface.
- Existing admins must continue to function normally after the old top-level `Developer Options` tab is removed.

## Final Approved Direction

The approved v1 direction is:

- first-class `developer` role in code
- developers inherit all existing admin powers
- a developer-only top-level `Developer Settings` workspace inside the admin dashboard
- internal tabs for `Overview`, `Developer Settings`, `Datasets`, and `Training`
- overview metrics powered by imported run results
- dataset browsing powered by live inspection rows with server-side ZIP export
- training history powered by imported ZIP manifests and optional artifacts
- no browser-run training jobs
- no new relational schema beyond the already-added role/policy migrations
