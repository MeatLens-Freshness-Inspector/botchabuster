# Pre-Scan Safety Protocol Design

## Summary

Add a required pre-scan checklist to the Inspect page before inspectors can open the camera or capture a sample. The checklist records stall metadata plus three safety protocol checks. When all protocol checks pass, the current AI inspection flow continues unchanged. When any protocol check fails, the inspector may still capture a photo, but the app skips AI analysis and immediately saves the inspection as `spoiled` under a protocol-based decision path. All pre-scan answers must be persisted on the inspection record through a new database migration, preserved in offline queue storage, and available in downstream history and admin reporting.

## Goals

- Require a pre-scan checklist before capture access for standard inspector workflows.
- Record stall number, certificate proof, expiry date, and environmental protocol answers on every inspection that uses the checklist.
- Reveal an additional `what color?` field when `light color correct` is answered `No`.
- Allow photo capture to continue even when protocol checks fail, but skip AI analysis in that case.
- Save protocol-failed inspections immediately as `spoiled`.
- Persist pre-scan answers directly on the `inspections` record through a new migration.
- Preserve the same protocol behavior while offline and sync those inspections later without changing the result source.
- Add a developer-only bypass toggle so unlocked developer sessions can skip the checklist gate during testing.

## Non-Goals

- Blocking capture permanently when protocol checks fail.
- Using `meat expiry date` alone to force spoilage in this version.
- Introducing a separate pre-scan table or a JSON blob for checklist storage.
- Backfilling old inspections with inferred pre-scan values.
- Reworking model scoring, training, or backend AI analysis endpoints.
- Changing the current admin unlock model for developer options.

## Existing System Context

The current system already has:

- Frontend inspection flow in `frontend/src/pages/user/inspections/hooks/useInspectPage.ts`.
- Inspect page composition in `frontend/src/pages/user/inspections/components/InspectPageView.tsx`.
- Capture UI in `InspectCaptureSection` and `CameraCapture`.
- Existing developer feature flags in `frontend/src/components/DeveloperOptionsPanel.tsx` and `frontend/src/lib/developerOptions.ts`.
- Inspection API types in `frontend/src/types/inspection.ts` and `backend/src/types/inspection.ts`.
- Backend inspection creation through `InspectionController` and `InspectionService`.
- Offline queued scan storage in `frontend/src/lib/offlineQueue.ts` and replay in `frontend/src/components/OfflineSyncManager.tsx`.
- Supabase migrations in `backend/supabase/migrations`.

Today, the inspect flow is:

1. Select manual market location.
2. Capture or upload a photo.
3. Run AI analysis.
4. Auto-save when confidence is high, or let the inspector save manually for lower-confidence results.

The new design adds a protocol stage before capture and a second save path that can bypass AI entirely.

## Approved Product Rules

The following product rules were explicitly approved during design:

- Pre-scan happens before the camera can be opened.
- Checklist answers must both gate capture and be saved to the database.
- Developers should have a separate option to disable the pre-scan requirement.
- `No` on a protocol check should not hard-block capture forever; instead, it forces a protocol-based spoiled result.
- When protocol fails, AI analysis must be skipped entirely for food safety reasons.
- Protocol-failed inspections must be saved immediately after photo acceptance.
- Every database change must use a new migration file rather than editing an old migration.

## Data Model

### Inspection Columns

Add the following nullable columns to `public.inspections` through a new migration:

- `stall_number text`
- `meat_inspection_certificate_proof text`
- `meat_expiry_date date`
- `storage_correct boolean`
- `light_color_correct boolean`
- `light_color_observed text`
- `area_clean boolean`
- `inspection_decision_source text`
- `protocol_spoiled_reason text`

### Column Rules

- `stall_number`, `meat_inspection_certificate_proof`, and `meat_expiry_date` are required in normal checklist-driven flows, but remain nullable at the database level so legacy rows and developer-bypass rows remain valid.
- `storage_correct`, `light_color_correct`, and `area_clean` are required in checklist-driven flows, but also remain nullable at the database level for the same reason.
- `light_color_observed` is only populated when `light_color_correct = false` and should otherwise be `null`.
- `inspection_decision_source` stores one of:
  - `ai`
  - `protocol_pre_scan`
- `protocol_spoiled_reason` is `null` for normal AI inspections and stores a standardized reason such as `failed_pre_scan_safety_protocol` for forced protocol spoilage.

### Why Fields Live On `inspections`

Pre-scan data belongs on the inspection row instead of a separate table because:

- the values describe a single capture event
- the current app already treats one inspection row as the complete saved unit
- offline replay currently targets one inspection payload
- history, admin exports, and inspection detail views already read from `Inspection`
- immediate protocol spoilage can reuse the same save path without a second write or join

### Legacy Data

No backfill is required. Existing rows keep `null` values for all new fields and continue to render normally.

## Frontend UX

### Page Layout

Add a new `InspectPreScanSection` above the current capture section so the inspect page becomes:

1. Pre-scan checklist
2. Capture station
3. Analysis or protocol result
4. Save / reset actions when applicable

### Checklist Fields

The pre-scan section must collect:

- `stall number`
- `meat inspection certificate proof`
- `meat expiry date`
- `storage correct?` yes/no
- `light color correct?` yes/no
- `what color?` required only when `light color correct = no`
- `area clean?` yes/no

### Capture Gating

Camera access remains disabled until the checklist is complete, unless developer bypass is active.

Capture gating rules:

- disable both `Open Camera` and any other capture entrypoint until the checklist is valid
- do not allow partial checklist completion to unlock capture
- if developer bypass is enabled, skip checklist gating entirely for camera access
- when bypass is active, show a small inline note such as `Developer bypass active`

### Validation Rules

Checklist validity requires:

- non-empty `stall number`
- non-empty `meat inspection certificate proof`
- selected `meat expiry date`
- explicit answers for all three yes/no protocol checks
- non-empty `what color?` when `light color correct = no`

This validation is frontend behavior for capture gating. The database remains permissive enough for legacy and bypassed records.

## Protocol Evaluation

### Protocol Failure Helper

Create one shared decision helper for the inspect flow that computes:

- `hasProtocolFailure`
- `inspectionDecisionSource`

Rules:

- `hasProtocolFailure = true` when any of these are `false`:
  - `storage_correct`
  - `light_color_correct`
  - `area_clean`
- otherwise `hasProtocolFailure = false`

### Normal AI Path

When `hasProtocolFailure = false`:

- keep the current inspect behavior
- capture photo
- run AI analysis
- auto-save on the current high-confidence rule
- allow manual save on the existing lower-confidence path
- persist `inspection_decision_source = ai`

### Protocol Spoiled Path

When `hasProtocolFailure = true`:

- allow photo capture after checklist completion
- skip AI analysis entirely
- upload and store the image as usual
- save immediately after the accepted photo is available
- force:
  - `classification = spoiled`
  - `inspection_decision_source = protocol_pre_scan`
  - `protocol_spoiled_reason = failed_pre_scan_safety_protocol`
- do not show the `Analyze Sample` button
- transition directly to a saved state after success

### Forced Result Payload

Protocol-spoiled saves should use a consistent synthetic inspection result contract:

- `classification = spoiled`
- `confidence_score = 100`
- `flagged_deviations` includes a standardized protocol marker such as `failed_pre_scan_safety_protocol`
- `explanation` clearly states that the result was forced by failed pre-scan safety protocol and that AI analysis was skipped

`confidence_score = 100` here represents deterministic protocol enforcement, not model confidence. This keeps existing numeric displays functional until the product introduces separate scoring semantics for protocol decisions.

## Capture And Save Flow

### Capture Success With Passing Protocol

For passing checklist results:

1. Inspector completes checklist.
2. Camera access unlocks.
3. Inspector captures a photo.
4. AI analysis runs.
5. Existing save path continues.
6. Inspection is stored with checklist fields plus `inspection_decision_source = ai`.

### Capture Success With Failed Protocol

For failed checklist results:

1. Inspector completes checklist.
2. Camera access unlocks.
3. Inspector captures a photo.
4. AI analysis is skipped.
5. Inspection image uploads or queues.
6. Inspection saves immediately as `spoiled`.
7. The UI shows a protocol result notice instead of model analysis.

### Result Presentation

Protocol-failed inspections should show a clear non-AI result state in the analysis panel using this copy:

- `Protocol result: Spoiled`
- `Reason: Failed pre-scan safety protocol`

After successful protocol save:

- show a saved state
- show `New Scan`
- do not keep an analyze action available

## Developer Bypass

### New Developer Flag

Add a new developer flag, stored alongside the existing developer options flags:

- `bypassPreScanChecklist`

This flag should:

- appear in `DeveloperOptionsPanel`
- require the existing unlocked developer session
- only affect admin users with developer access

### Bypass Scope

Bypass affects camera gating only.

Behavior:

- capture opens without checklist completion
- existing inspect flow remains available for developer testing
- checklist fields may remain empty on records created through bypass
- bypass does not force protocol spoilage and does not auto-fill checklist data

## Offline Behavior

### Queue Storage

Extend the offline queued scan payload to preserve:

- pre-scan checklist answers
- protocol failure status
- inspection decision source
- protocol spoiled reason

These values belong to the original capture and must be stored together with the image and location metadata.

### Offline Passing Protocol

When offline and the checklist passes:

- preserve the current offline AI behavior
- queue the image and saved AI result as the app does today
- include the checklist fields in the queued payload

### Offline Failed Protocol

When offline and the checklist fails:

- keep the same protocol behavior as online
- skip AI analysis
- immediately create a forced spoiled payload
- queue the image plus checklist and protocol metadata locally
- sync later without re-evaluating or re-running analysis

### Sync Replay

During sync replay:

- reuse the stored decision source from the queue
- do not try to run AI later for protocol-failed inspections
- submit the exact forced-spoiled inspection payload once

This keeps food-safety behavior consistent whether the device was online or offline during capture.

## Backend Design

### Request Contract

Extend inspection create payloads to accept:

- `stall_number`
- `meat_inspection_certificate_proof`
- `meat_expiry_date`
- `storage_correct`
- `light_color_correct`
- `light_color_observed`
- `area_clean`
- `inspection_decision_source`
- `protocol_spoiled_reason`

These fields should flow through:

- frontend `InspectionInsert`
- frontend `InspectionClient.create`
- backend `InspectionInsert`
- backend controller request parsing
- backend service payload builder
- returned `Inspection` records

### Validation

Backend validation should remain explicit but lightweight:

- accept `undefined` and `null` for new optional fields
- validate boolean fields when present
- validate `meat_expiry_date` as a valid date string when present
- validate `inspection_decision_source` against the allowed values
- require `classification = spoiled` and a non-null `protocol_spoiled_reason` when `inspection_decision_source = protocol_pre_scan`
- require `protocol_spoiled_reason = null` when `inspection_decision_source = ai`
- normalize `light_color_observed` to `null` when `light_color_correct` is not `false`

Cross-field checklist completeness remains a frontend concern because developer bypass intentionally allows missing checklist data.

### Persistence

The backend should:

- persist all new columns on insert
- return them on create, get-by-id, and get-all reads
- include them in any downstream `Inspection` object consumers

### Audit Logging

Inspection creation audit logs should capture the full pre-scan context when present, including:

- stall metadata
- protocol answers
- decision source
- protocol spoiled reason

This keeps protocol-based decisions auditable alongside the image capture event.

## Reporting And History

### Inspector History

Inspection detail views and history outputs should be able to display the stored pre-scan data later. Minimum required support:

- checklist fields are available on the inspection object
- protocol-spoiled records visibly distinguish that the result came from pre-scan protocol instead of AI

### Admin Reporting

Admin exports and dashboards should have access to:

- checklist fields
- decision source
- protocol spoiled reason

This version does not require a new reporting UI, but the schema and API shape must make later reporting straightforward.

## Testing Strategy

### Frontend Unit Coverage

- checklist validation logic for required fields
- `what color?` required only when light color is marked `No`
- protocol decision helper computes failure correctly
- developer bypass leaves capture unlocked without checklist completion

### Frontend Integration And E2E Coverage

- capture stays locked until checklist is complete
- `what color?` appears only when `light color correct = No`
- passing checklist keeps the existing AI flow
- failed protocol skips AI
- failed protocol saves immediately as protocol-spoiled
- developer bypass unlocks capture without checklist completion
- offline protocol-failed capture queues the forced spoiled payload without analysis

### Backend Coverage

- inspection create accepts and persists the new fields
- invalid decision source or invalid date input is rejected
- service payload builder maps all new fields correctly
- returned inspection objects include the new fields

### Migration Rule

The database change must be implemented through a new migration file in `backend/supabase/migrations`. No existing migration should be edited.

## Files Expected To Change

Likely areas of change:

- new Supabase migration for inspection pre-scan columns
- frontend inspection types and API client
- `useInspectPage` state, protocol evaluation, and save branching
- new pre-scan UI component on the inspect page
- developer options flag definitions and panel UI
- offline queue storage and replay
- backend inspection types, controller validation, and service payload builder
- inspection history and detail consumers that should surface stored protocol context
- frontend and backend tests for the new flow

## Rollout Notes

- This is an additive schema and flow change.
- Old inspections remain valid with null pre-scan fields.
- Developer bypass is intentionally scoped to testing and should remain visually obvious when active.
- Protocol enforcement is decided at capture time and must not be reinterpreted later during sync.
