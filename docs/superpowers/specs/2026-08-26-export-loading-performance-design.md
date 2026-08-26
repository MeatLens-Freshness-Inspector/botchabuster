# Export Loading and Performance Design

Date: 2026-08-26

## Goal

Make every export action visibly busy while it runs and reduce the time required to export large datasets, especially exports containing 100 to 1,000 original inspection images.

## Scope and constraints

In scope:

- Admin Reports PDF, CSV, and JSON exports.
- Inspector History PDF export.
- Developer Datasets ZIP export.
- Developer Settings Offline Queue JSON export.
- Query and ZIP-generation performance for Developer Dataset exports.
- Image loading performance for report PDFs.

Constraints:

- Preserve every original inspection image that has an image URL.
- Do not introduce lazy loading.
- Do not add external infrastructure, background workers, job queues, polling, Redis, new storage services, or third-party services.
- Use the existing React frontend, Express backend, Supabase database/storage, `pdfmake`, and `fflate` dependencies.
- Keep existing export file formats, report layouts, filters, and success/error notifications unless a change is required to preserve export integrity.

## Architecture

Exports remain synchronous through the existing application routes and client workflows.

The frontend owns the user-facing busy state. The backend continues to generate Developer Dataset ZIP files during the existing request. Supabase remains the only database and object storage dependency. No global loading state or new asynchronous job system is introduced.

The existing paginated developer dataset query remains responsible for the Datasets table and its exact record count. A separate export query is added for ZIP generation so table concerns do not make large exports slower.

## Shared loading experience

Add a shared `ExportLoadingOverlay` UI component for export-capable panels. The overlay is rendered inside the active panel, keeps the panel content visible underneath, and communicates an indeterminate preparation state with a spinner and live status text.

The overlay:

- Uses `role="status"`, an accessible live message, and panel-level `aria-busy`.
- Disables export buttons to prevent duplicate downloads.
- Disables panel controls that could mutate the export inputs while an export is active.
- Uses action-specific text such as `Preparing PDF export...` and `Preparing dataset export...`.
- Is removed on success or failure while existing toasts remain responsible for completion/error feedback.
- Does not activate for invalid report ranges or empty report selections because those validations happen first.

Export state coverage:

- Admin Reports exposes an active export format state for PDF, CSV, and JSON.
- Inspector History exposes a dedicated PDF exporting state.
- Developer Datasets uses its existing dataset export state and connects it to the shared overlay.
- Developer Settings adds a dedicated Offline Queue exporting state rather than reusing the broader busy state used by queue maintenance actions.

CSV, JSON, and Offline Queue handlers yield to the browser once after setting the state so the loading UI can paint before synchronous serialization and download work begins.

## Developer Dataset ZIP performance and integrity

### Export query

Add a dedicated export-row query in the inspection persistence service. It will:

- Select only fields needed by `inspections.csv`, `manifest.json`, and image retrieval.
- Apply the existing meat type, manual classification, inspector, location, image-presence, and date filters.
- Start from offset `0` and use the existing maximum of 10,000 records.
- Preserve descending `created_at` and `id` ordering.
- Omit the exact count request, since the export already knows the number of rows it is returning and does not need a table pagination total.

Keep the existing paginated query unchanged for table browsing.

### Database query support

Add only local Supabase/Postgres indexes for high-volume export filters and ordering. The migration must not add extensions or external dependencies. Existing indexes are preserved; new indexes should support the most common equality filters alongside `created_at` and `id` ordering without creating a broad unbounded projection.

### Image retrieval

For each inspection with an image URL:

- Download the original response bytes without transforming or resizing them.
- Use bounded concurrency higher than the current six-worker limit, with a conservative fixed cap to avoid saturating storage or the API.
- Abort individual image requests after a fixed per-image timeout.
- Retry transient failures a limited number of times.
- Preserve the original inspection order in the result array.

If an inspection has no image URL, it remains in the CSV and manifest without an image file. If an image URL exists but all download attempts fail, the complete export fails and reports the affected inspection IDs. The server must not return a successful ZIP that silently omits required images.

### ZIP assembly

Keep the current ZIP contents: `manifest.json`, `inspections.csv`, and `images/*`. Use ZIP store/no-compression mode for already-compressed JPEG, PNG, and WebP files so the server does not spend time recompressing image bytes. CSV and manifest content remain UTF-8 and continue to use the current escaping rules.

The frontend keeps a long-running request timeout appropriate for the synchronous export. Increasing a timeout alone is not considered a performance fix; the query, image retrieval, and ZIP assembly changes are required first.

## Report PDF performance

Keep the current browser-generated `pdfmake` pipeline and organization-specific layouts. Change evidence-image loading to use bounded concurrency and a per-export in-memory cache keyed by URL, preventing duplicate fetches while avoiding an unbounded burst of requests. Existing required evidence images and graceful unavailable-image placeholders remain supported.

## Error handling

- Existing validation errors continue to return immediately without entering the loading state.
- Existing success toasts remain unchanged unless the action wording needs to distinguish a completed export.
- Existing export error toasts remain visible.
- Developer ZIP image failures include enough record identity in the server error for the frontend to show a useful failure message.
- Cleanup of object URLs, temporary anchors, and request timers remains guaranteed on both success and failure.

## Testing strategy

Add or update tests before implementation for:

- Shared loading/disabled behavior for all export-capable panel actions.
- Admin report format state transitions and browser-yield behavior for synchronous exports.
- Inspector History and Offline Queue export state transitions.
- Developer Dataset export query projection, zero-offset behavior, filter preservation, and absence of an exact count request.
- Image concurrency, retry, timeout, and required-image failure behavior.
- ZIP entries, CSV/manifest contents, image byte preservation, and no-compression configuration.
- Bounded/cached PDF evidence-image loading.
- Existing report, history, dataset, offline queue, and export timeout regressions.

Verification will include focused frontend/backend tests, frontend typecheck/lint, backend typecheck/lint where configured, and a production frontend build.

## Non-goals

- No lazy-loaded panels or export modules.
- No background export job API.
- No progress polling or server-side job persistence.
- No new infrastructure or external service.
- No redesign of report contents or dataset schema.
