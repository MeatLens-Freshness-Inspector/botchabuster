# Inspection Result Dispute Design

## Summary

Add a dispute workflow that lets meat inspectors challenge a model result with an expected classification and explanation. A dispute is reviewable by an admin or developer. Developers may apply the disputed classification to the developer dataset immediately, but the inspector-facing official result changes only after approval.

The original model output remains preserved for auditability and model evaluation.

## Context

The existing inspection record has two relevant classifications:

- `classification`: the original model result, currently used by inspector history and administrative reports.
- `manual_classification`: the developer dataset label, currently used as ground truth for developer metrics and dataset exports.

The existing developer endpoint edits `manual_classification` directly. It must not be reused as the official-result workflow because an inspector dispute is not automatically a trusted ground-truth correction.

## Goals

- Allow an authenticated meat inspector to dispute an inspection result.
- Require an expected classification and a meaningful explanation.
- Preserve the original model result permanently.
- Allow a developer to apply a dispute to the developer dataset without changing the official result.
- Require admin or developer approval before changing the official result.
- Keep old inspections unchanged while allowing them to be disputed.
- Retain the dispute and approval history for audit and future review.

## Non-goals

- Automatically retraining or changing a model after a dispute.
- Automatically converting every dispute into developer ground truth.
- Backfilling historical inspections as officially reviewed.
- Replacing the existing direct developer dataset-label tool.

## Recommended data model

### Inspection record

Add a nullable `official_classification` column to `public.inspections` using the existing `freshness_classification` enum.

- `classification` remains the immutable model output.
- `official_classification` is populated only by an approved dispute.
- The current official result is resolved as `official_classification ?? classification`.
- `manual_classification` remains the developer dataset label.

No existing inspection rows are backfilled. Their `official_classification` remains `NULL`, so their displayed result remains their original `classification`.

### Dispute record

Create `public.inspection_result_disputes` with:

- `id` UUID primary key
- `inspection_id` UUID foreign key to `inspections.id`
- `submitted_by` UUID foreign key to `auth.users.id`
- `expected_classification` `freshness_classification` not null
- `reason` text not null with a trimmed length of 10–2,000 characters
- `status` text not null with a check constraint allowing only `pending`, `approved`, or `rejected`; default `pending`
- `developer_label_applied_at` nullable timestamp
- `developer_label_applied_by` nullable user ID
- `reviewed_at` nullable timestamp
- `reviewed_by` nullable user ID
- `reviewer_note` nullable text
- `created_at` and `updated_at` timestamps

Keep rejected and approved disputes rather than deleting them. Add a partial unique index so an inspection cannot have more than one `pending` dispute at a time.

Applying a dispute to the developer dataset updates `manual_classification` and records the developer actor and timestamp on the dispute. It does not update `official_classification`.

Rejecting an official dispute does not automatically undo a separately applied developer dataset label; the developer label remains a separate, explicitly managed dataset decision.

## Workflow

### Inspector submission

1. The inspector opens an inspection and selects `Dispute result`.
2. The inspector selects the expected classification and enters an explanation.
3. The backend verifies authentication, inspection access/ownership, classification validity, and that the trimmed reason is 10–2,000 characters.
4. The backend creates a `pending` dispute and writes an audit event.
5. The original model result and current official result remain unchanged.

### Developer dataset application

1. A developer reviews the dispute in the developer dashboard.
2. The developer selects `Apply to developer dataset`.
3. The backend updates `manual_classification` to `expected_classification` and records the action on the dispute.
4. Developer metrics and exports may use the updated manual label.
5. The official result remains unchanged until an approval decision.

### Official approval or rejection

1. An admin or developer reviews the pending dispute.
2. On approval, the backend sets `inspections.official_classification` to `expected_classification`, marks the dispute approved, and records the reviewer.
3. On rejection, the backend marks the dispute rejected and records the reviewer note; the official result remains unchanged.
4. The approval/rejection and resulting classification change are written as audit events.

Approval must be conditional on the dispute still being `pending` so two reviewers cannot apply conflicting decisions. The status transition and official classification update should be performed atomically through a database function/RPC or equivalent transaction boundary.

## Result display and reporting

Inspector-facing history, inspection details, and official administrative reports should use the effective result:

```text
official_classification ?? classification
```

When an official override exists, the UI should show both values, for example:

- Official result: `fresh`
- Model result: `spoiled`

Developer model metrics should continue comparing the original `classification` with `manual_classification`. This keeps model evaluation explicit and prevents an official workflow decision from silently changing training labels.

## API boundaries

The implementation should add dedicated dispute endpoints rather than overload the existing developer dataset-label endpoint:

- Inspector-authenticated endpoint to create a dispute for an inspection.
- Admin/developer endpoint to list pending and historical disputes.
- Developer-only endpoint to apply a dispute to the developer dataset.
- Admin/developer endpoint to approve or reject a dispute.

The existing direct developer dataset-label endpoint remains available for explicit developer curation, but new dispute-driven changes should use the dispute ID so the source and reason are retained.

All endpoints must validate UUIDs, enum values, text length, resource access, and role permissions server-side. The client must not be trusted to identify the submitting or reviewing user.

## Legacy records

The migration adds `official_classification` as nullable and does not update existing rows. Therefore:

- old inspections continue to display their current model result;
- old inspections can receive new disputes;
- a later approved dispute can populate their official result;
- existing `manual_classification` values are preserved and are not automatically promoted to official results.

If a specific historical manual label is known to have been officially approved outside this workflow, it must be migrated through an explicit, audited allowlist rather than a blanket backfill.

## Error handling and concurrency

- Missing or invalid expected classification: `400`.
- Missing or invalid-length explanation (fewer than 10 or more than 2,000 trimmed characters): `400`.
- Unauthenticated request: `401`.
- Inspector attempting to dispute an inaccessible inspection: `403` or `404` according to the existing inspection access convention.
- Non-admin/non-developer review or dataset-application attempt: `403`.
- A second pending dispute for the same inspection: `409`.
- Approval/rejection of a dispute that is no longer pending: `409`.
- If the atomic approval update fails, neither the dispute status nor official result may be partially changed.

## Audit requirements

Record the actual actor, role, inspection ID, dispute ID, previous value, new value, and event time for:

- dispute submission;
- developer dataset application;
- official approval;
- official rejection.

The existing encrypted audit-log service should be used for these events.

## Testing requirements

### Backend unit tests

- Validate allowed classifications and explanation limits.
- Verify inspector ownership/access checks.
- Verify one pending dispute per inspection.
- Verify developer dataset application changes only `manual_classification`.
- Verify approval changes only `official_classification` and dispute status.
- Verify rejection leaves the official result unchanged.
- Verify stale or already-reviewed disputes cannot be reviewed again.
- Verify legacy records with `official_classification = NULL` resolve to `classification`.

### Integration and contract tests

- Submit, apply, approve, and reject a complete dispute lifecycle.
- Verify role restrictions for inspector, admin, and developer actions.
- Verify atomic approval behavior under concurrent review attempts.
- Verify old inspections remain visible and disputable.
- Verify API responses expose both effective and original model results where appropriate.

### Frontend tests

- Dispute form validation and submission states.
- Pending-dispute and already-disputed states.
- Developer dashboard action for applying a dispute to the dataset.
- Admin/developer approval and rejection controls.
- Display of official and original model results.

## Acceptance criteria

- An inspector can dispute an old or new inspection with an expected result and explanation.
- A developer can apply the disputed result to developer-only data without altering the official result.
- An admin or developer can approve or reject the dispute.
- Approval changes the effective official result while preserving the original model result.
- Rejection leaves the official result unchanged.
- Existing records and existing developer dataset labels are not altered by the migration.
- Every dispute action is attributable through audit logs.
