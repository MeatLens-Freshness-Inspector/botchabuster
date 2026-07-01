# Inspection GPS Coordinates Design

## Summary

Extend inspection capture so each report can store and display the user's exact GPS coordinates alongside the existing manual location selection. The app will attempt to capture coordinates immediately after each photo capture, persist them on the inspection record through new database columns, preserve them through offline sync, and render them in history and admin report outputs.

## Goals

- Keep the existing manual location input as part of every inspection.
- Attempt real-time GPS coordinate capture as soon as a photo is captured.
- Store exact coordinates on the `inspections` table through a new migration.
- Preserve captured coordinates in offline queued scans and later sync them to the backend.
- Show manual location plus `latitude, longitude` together in report-related UI and exports.

## Non-Goals

- Blocking save when geolocation fails, permissions are denied, or GPS is unavailable.
- Adding map rendering, reverse geocoding, or spatial search features.
- Replacing the manual location field with GPS-derived text.
- Backfilling old inspection records with inferred coordinates.
- Introducing PostGIS or geography-based querying.

## Existing System Context

The current system already has:

- Frontend inspection capture and save flow in `frontend/src/pages/user/inspections/hooks/useInspectPage.ts`.
- A manual market location selector in `InspectCaptureSection`.
- Offline inspection queue storage in `frontend/src/lib/offlineQueue.ts`.
- Offline sync replay in `frontend/src/components/OfflineSyncManager.tsx`.
- Shared inspection API types in `frontend/src/types/inspection.ts` and `backend/src/types/inspection.ts`.
- Backend inspection create flow through `InspectionController` and `InspectionService`.
- Supabase schema migrations in `backend/supabase/migrations`.
- Inspector history report generation in `frontend/src/pages/user/history/utils/historyPage.ts`.
- Admin report export generation in `frontend/src/pages/admin-dashboard/hooks/useAdminDashboardPage.ts`.

Today, inspection records only persist the manual `location` text. Reports and exports read directly from `Inspection` objects, so the coordinate fields should be added to that shared record shape rather than handled as a separate reporting-only structure.

## Data Model

### Inspection Columns

Add two nullable columns to `public.inspections` through a new migration:

- `location_latitude double precision`
- `location_longitude double precision`

Requirements:

- Both columns are nullable.
- Both columns belong on `inspections`, not `profiles`, because they describe a single capture event.
- The existing `location` text column remains unchanged and continues to store the manual location selection.

### Why Separate Columns

Two scalar columns fit the current app architecture best:

- They are easy to type in both frontend and backend TypeScript models.
- They are easy to include in HTML, CSV, JSON, and PDF exports.
- They keep the current Supabase insert/select flow simple.
- They avoid unnecessary JSON parsing or geospatial database complexity.

### Legacy Data

No backfill is required. Existing inspection rows will retain `null` coordinate values and continue to render normally.

## Capture Behavior

### Trigger Point

The app will start geolocation lookup immediately after `onCapture` receives a new photo payload.

Behavior:

- Every new photo capture starts a fresh geolocation attempt.
- Retaking a photo clears the previous coordinate state and starts a new lookup for the new capture.
- Coordinates belong to the captured inspection attempt, not to the user session.

### Save Rules

Save behavior remains intentionally permissive:

- The app must attempt coordinate capture for every photo capture.
- Save is still allowed if coordinates cannot be obtained.
- Successful coordinate capture attaches the numeric values to the saved inspection.
- Failed capture stores `null` coordinates while still saving the manual location and the rest of the inspection.

This matches the approved rule that GPS lookup is mandatory to attempt, but not mandatory to succeed.

## Frontend UX

### Manual Location Area

Keep the existing manual location selector and add a small inline note near it:

`Manual location is saved, and real-time GPS coordinates are captured when available.`

This note makes it explicit that both location forms are part of the report.

### Coordinate Status Feedback

After a photo is captured, the page should show lightweight coordinate status near the capture/location area:

- While lookup is in progress: `Capturing GPS coordinates...`
- On success: show the exact `latitude, longitude`
- On failure: `GPS coordinates unavailable for this capture`

This status should be informational only and must not hard-block analyze or save actions.

### Shared Inspection Display

Where inspection detail is shown, the manual location should remain primary text and coordinates should appear beside it when present, for example:

`Central Market (14.5995, 120.9842)`

If coordinates are absent, the UI should continue showing only the manual location.

## Offline Behavior

### Queue Storage

Extend the IndexedDB `PendingScan` payload to store:

- `locationLatitude`
- `locationLongitude`

These values should be written when the capture-side geolocation attempt succeeds before save or sync.

### Sync Replay

When queued scans are uploaded after reconnect:

- Reuse the stored coordinates from the offline queue.
- Do not re-request browser geolocation during sync.
- Submit the preserved values to the inspection create API exactly once with the rest of the inspection payload.

This keeps the saved coordinates tied to the original capture moment rather than the later sync moment.

### Offline GPS Expectations

Device GPS may still work without network connectivity, so the app should use the same browser geolocation API offline and online. Offline mode is not treated as a reason to skip coordinate capture.

## Backend Design

### Request Contract

Extend inspection create payloads to accept optional numeric fields:

- `location_latitude`
- `location_longitude`

These fields should flow through:

- frontend `InspectionInsert`
- frontend `InspectionClient.create`
- backend controller request parsing
- backend `InspectionInsert` type
- backend `InspectionService.buildInsertPayload`

### Validation

Backend validation should be minimal and explicit:

- Accept `undefined` or `null` coordinate fields.
- If a coordinate field is present, it must be a valid number.
- Reject non-numeric values with a `400`-class error at the controller boundary.

No additional range validation is required for this change unless the existing request layer already has a clean shared pattern for it.

### Persistence and Reads

The backend should persist both coordinate fields to Supabase and include them in returned inspection records so all current readers receive one consistent `Inspection` shape.

### Audit Log Payload

Inspection creation audit logs should also include the coordinates when present so the stored event data reflects the full capture context.

## Reporting and Export Behavior

### Inspector History

The following inspector-facing surfaces should render coordinates beside the manual location when available:

- inspection list cards where location is shown
- inspection detail sheet
- daily detailed HTML/PDF report generated from history

### Admin Reports

The following admin export paths should include coordinates next to the manual location:

- CSV detail export
- JSON snapshot export
- HTML/PDF summary export

If an export already splits fields into columns, the implementation may either:

- keep one display field combining manual location and coordinates for presentation-focused outputs, or
- add separate raw latitude/longitude fields in machine-readable outputs while still showing combined text in human-readable sections

The minimum required behavior is that reports visibly show `lat, long` beside the manual location.

### Fallback Rendering

Old or failed-coordinate inspections must render cleanly:

- with coordinates: `Manual Location (lat, long)`
- without coordinates: `Manual Location`
- without manual location: existing fallback behavior remains unchanged

## Testing Strategy

### Frontend Tests

- Add coverage that a new photo capture starts geolocation lookup.
- Add coverage that successful geolocation values are attached to online saves.
- Add coverage that failed geolocation does not block save.
- Add coverage that offline queued scans preserve coordinates and send them during sync.
- Update report-related tests to assert manual location plus coordinates render together when present.

### Backend Tests

- Add or extend inspection create tests for optional coordinate acceptance.
- Add or extend inspection persistence tests to verify both columns are written and returned.
- Add coverage that invalid non-numeric coordinate inputs are rejected.

### Report Export Tests

- Verify inspector history HTML export includes coordinates next to the manual location.
- Verify admin CSV/JSON/PDF export paths include the new coordinate data.
- Verify records without coordinates still export correctly.

## Files Expected To Change

Likely areas of change:

- new Supabase migration adding coordinate columns to `inspections`
- frontend inspection types and API client
- `useInspectPage` capture and save flow
- `InspectCaptureSection` location note and coordinate status UI
- offline queue storage and sync replay
- backend inspection types, controller validation, and service payload builder
- history inspection display components and report builder
- admin report export mapping and presentation
- relevant frontend and backend tests

## Rollout Notes

- This change requires a new migration and must not modify an old migration file.
- Existing inspections remain valid with `null` coordinates.
- No data backfill or user profile migration is required.
- The feature is additive and should not change current inspection creation semantics beyond attaching best-effort GPS data.
