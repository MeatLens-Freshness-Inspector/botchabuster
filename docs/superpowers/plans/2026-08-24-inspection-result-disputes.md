# Inspection Result Disputes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inspector-submitted result disputes with developer-only dataset application and admin/developer approval for official result changes, while preserving the original model output and supporting legacy inspections.

**Architecture:** Add a new `inspection_result_disputes` workflow inside the inspections module. Keep `inspections.classification` immutable, add nullable `official_classification`, and resolve the current official result as `official_classification ?? classification`. Use a database migration plus an atomic Supabase RPC for approved official changes; expose dedicated authenticated APIs and add focused inspector/developer UI flows.

**Tech Stack:** TypeScript, Express, Supabase/Postgres migrations and RPC, React, React Hook Form, existing auth/CSRF middleware, existing encrypted audit-log service, Node test runner, frontend TypeScript tests.

## Global Constraints

- Use a new Supabase migration; do not edit any existing migration.
- Preserve `inspections.classification` as the original model output.
- Keep `manual_classification` as the developer dataset label.
- Do not automatically promote existing `manual_classification` values to official results.
- Require a trimmed dispute explanation between 10 and 2,000 characters.
- Allow only `fresh`, `not fresh`, `spoiled`, `acceptable`, and `warning` classifications.
- Only authenticated inspectors may submit disputes for inspections they can access.
- Only developers may apply disputes to the developer dataset.
- Only admins or developers may approve or reject official disputes.
- Every dispute action must write an encrypted audit-log event with actor, role, inspection ID, dispute ID, previous value, new value, and event time.
- No production code may be written before its failing test is observed.

---

## File Map

### Database and backend

- Create: `backend/supabase/migrations/20260824150000_add_inspection_result_disputes.sql` — add nullable official result, dispute table/indexes/RLS, and atomic review/apply RPCs.
- Create: `backend/src/types/inspectionResultDispute.ts` — shared backend dispute types and validation constants.
- Modify: `backend/src/types/inspection.ts` — add `official_classification` to inspection read/write types where appropriate.
- Create: `backend/src/modules/inspections/domain/ports/InspectionResultDisputeRepository.ts` — repository boundary for dispute operations.
- Create: `backend/src/modules/inspections/infrastructure/InspectionResultDisputeService.ts` — Supabase implementation and RPC calls.
- Create: `backend/src/modules/inspections/application/CreateInspectionResultDispute.ts` — inspector submission use case.
- Create: `backend/src/modules/inspections/application/ListInspectionResultDisputes.ts` — admin/developer dispute listing use case.
- Create: `backend/src/modules/inspections/application/ApplyDisputeToDeveloperDataset.ts` — developer dataset-label use case.
- Create: `backend/src/modules/inspections/application/ReviewInspectionResultDispute.ts` — approve/reject use case.
- Create: `backend/src/modules/inspections/presentation/controllers/InspectionResultDisputeController.ts` — request parsing, auth context, response/error mapping, and audit writes.
- Modify: `backend/src/modules/inspections/presentation/routes.ts` — register dispute endpoints.
- Modify: `backend/src/modules/inspections/infrastructure/InspectionService.ts` — select `official_classification` and resolve official statistics.
- Modify: `backend/src/modules/developer/infrastructure/DeveloperDashboardService.ts` — expose dispute operations to the developer dashboard.
- Modify: `backend/src/modules/developer/presentation/controllers/DeveloperDashboardController.ts` — add dispute list/apply/review handlers.
- Modify: `backend/src/modules/developer/presentation/dashboard-routes.ts` — add developer-only dispute routes.
- Modify: `backend/src/types/developerDashboard.ts` — include dispute data in developer responses if needed by the UI.

### Backend tests

- Create: `backend/tests/unit/inspections/inspection-result-dispute-service.unit.test.ts` — service and RPC mapping behavior.
- Create: `backend/tests/unit/inspections/inspection-result-dispute-validation.unit.test.ts` — enum, reason, and status validation.
- Create: `backend/tests/unit/inspections/inspection-result-dispute-use-cases.unit.test.ts` — submission, dataset application, and review behavior.
- Create: `backend/tests/unit/inspections/inspection-result-dispute-controller.unit.test.ts` — request/auth/HTTP behavior.
- Modify: `backend/tests/unit/inspections/module-inspection-service.unit.test.ts` — legacy effective-result/statistics behavior.
- Modify: `backend/tests/architecture/route-registration.architecture.test.ts` — assert the new route remains registered through the composed router.

### Frontend

- Modify: `frontend/src/entities/inspection/model/types.ts` — add `official_classification` and dispute summary types.
- Modify: `frontend/src/entities/inspection/api/inspection-client.ts` — submit a dispute and read dispute data.
- Create: `frontend/src/entities/inspection/model/result.ts` — `getEffectiveClassification(inspection)` and display-label helpers.
- Modify: `frontend/src/widgets/inspection-history/ui/inspection-detail-sheet.tsx` — display official/model results and add the dispute form/action.
- Create: `frontend/src/widgets/inspection-history/ui/dispute-result-form.tsx` — classification selector, reason field, validation, and submit state.
- Modify: `frontend/src/widgets/inspection-history/model/use-history.ts` — submit disputes and refresh selected inspection state.
- Modify: `frontend/src/features/developer-tools/api/developer-dashboard-client.ts` — list/apply/review disputes.
- Modify: `frontend/src/features/developer-tools/model/use-developer-dashboard.ts` — load pending disputes and expose mutations.
- Modify: `frontend/src/features/developer-tools/ui/datasets-section.tsx` — show dispute status and developer dataset application action.
- Create: `frontend/src/features/developer-tools/ui/disputes-section.tsx` — review queue with approve/reject controls.
- Modify: the developer workspace composition file that renders `DeveloperDatasetsSection` — render the dispute review section without fetching it for non-developers.
- Modify: `frontend/src/widgets/admin-dashboard/model/use-dashboard-report.ts` — use effective classification for official summaries while retaining original/model fields.
- Modify: `frontend/src/widgets/admin-dashboard/ui/inspections-tab.tsx` — display effective result and original model result when overridden.
- Modify: `frontend/src/entities/inspection/ui/inspection-list-item.tsx` and related history summary components — use the effective result for official display.

### Frontend tests

- Create: `frontend/tests/unit/entities/inspection/result.unit.test.ts` — effective classification fallback/override behavior.
- Create: `frontend/tests/unit/widgets/inspection-history/dispute-result-form.unit.test.tsx` — form validation and submission state.
- Create: `frontend/tests/unit/features/developer-tools/disputes-section.unit.test.tsx` — role-visible actions and review outcomes.
- Modify: existing inspection/history tests for overridden-result display.

---

## Task 1: Add the database migration and backend dispute types

**Files:**
- Create: `backend/supabase/migrations/20260824150000_add_inspection_result_disputes.sql`
- Create: `backend/src/types/inspectionResultDispute.ts`
- Modify: `backend/src/types/inspection.ts`
- Test: `backend/tests/unit/inspections/inspection-result-dispute-validation.unit.test.ts`

**Interfaces:**
- Produces `InspectionResultDisputeStatus = "pending" | "approved" | "rejected"`.
- Produces `InspectionResultDispute` with `id`, `inspection_id`, `submitted_by`, `expected_classification`, `reason`, status, developer-application metadata, review metadata, and timestamps.
- Produces `assertDisputeSubmission(input)` that returns normalized `{ expectedClassification, reason }` or throws a validation error.

- [ ] **Step 1: Write the failing validation tests**

Add tests for accepted classifications, whitespace trimming, rejection below 10 characters, rejection above 2,000 characters, and rejection of unknown status values. Import the not-yet-created `assertDisputeSubmission` so the failure is caused by the missing feature.

- [ ] **Step 2: Run the validation tests and verify the expected failure**

Run from `backend`:

```powershell
npm run test:unit -- tests/unit/inspections/inspection-result-dispute-validation.unit.test.ts
```

Expected: FAIL because `inspectionResultDispute.ts` and `assertDisputeSubmission` do not yet exist.

- [ ] **Step 3: Add the minimal shared types and validator**

Use the existing classification union and implement an allowlist validator:

```ts
export const DISPUTE_REASON_MIN_LENGTH = 10;
export const DISPUTE_REASON_MAX_LENGTH = 2_000;
export const INSPECTION_RESULT_DISPUTE_STATUSES = ["pending", "approved", "rejected"] as const;

export type InspectionResultDisputeStatus = (typeof INSPECTION_RESULT_DISPUTE_STATUSES)[number];

export type InspectionResultDispute = {
  id: string;
  inspection_id: string;
  submitted_by: string;
  expected_classification: Inspection["classification"];
  reason: string;
  status: InspectionResultDisputeStatus;
  developer_label_applied_at: string | null;
  developer_label_applied_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewer_note: string | null;
  created_at: string;
  updated_at: string;
};

export function assertDisputeSubmission(input: { expectedClassification: unknown; reason: unknown }): {
  expectedClassification: Inspection["classification"];
  reason: string;
} {
  const expectedClassification = typeof input.expectedClassification === "string"
    ? input.expectedClassification.trim().toLowerCase()
    : "";
  if (!ALLOWED_CLASSIFICATIONS.has(expectedClassification as Inspection["classification"])) {
    throw new Error("expectedClassification is invalid");
  }

  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (reason.length < DISPUTE_REASON_MIN_LENGTH || reason.length > DISPUTE_REASON_MAX_LENGTH) {
    throw new Error("reason must be between 10 and 2000 characters");
  }

  return { expectedClassification: expectedClassification as Inspection["classification"], reason };
}
```

Add `official_classification?: Inspection["classification"] | null` to `Inspection` and `InspectionInsert` only where it is a read/result field; creation must ignore client-provided official overrides.

- [ ] **Step 4: Run the tests and confirm they pass**

Run the same command. Expected: PASS with all validation cases green.

- [ ] **Step 5: Add the new migration without changing prior migrations**

The migration must:

```sql
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS official_classification public.freshness_classification;

CREATE TABLE IF NOT EXISTS public.inspection_result_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  expected_classification public.freshness_classification NOT NULL,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  developer_label_applied_at timestamptz,
  developer_label_applied_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewer_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS inspection_result_disputes_one_pending
  ON public.inspection_result_disputes (inspection_id)
  WHERE status = 'pending';
```

Enable RLS and add policies matching the application boundary: inspectors may insert/select disputes for their own inspections; admins/developers may read all disputes; only the service role may perform the atomic update functions. Do not backfill `official_classification` or modify old `manual_classification` values.

- [ ] **Step 6: Verify migration scope and commit**

Run:

```powershell
git diff --check
git diff --name-only -- backend/supabase/migrations backend/src/types
```

Expected: the only migration path is the new `20260824150000_add_inspection_result_disputes.sql`; no existing migration is modified. Commit:

```powershell
git add backend/supabase/migrations/20260824150000_add_inspection_result_disputes.sql backend/src/types/inspectionResultDispute.ts backend/src/types/inspection.ts backend/tests/unit/inspections/inspection-result-dispute-validation.unit.test.ts
git commit -m "feat: add inspection dispute schema"
```

---

## Task 2: Implement atomic dispute persistence and use cases

**Files:**
- Create: `backend/src/modules/inspections/domain/ports/InspectionResultDisputeRepository.ts`
- Create: `backend/src/modules/inspections/infrastructure/InspectionResultDisputeService.ts`
- Create: `backend/src/modules/inspections/application/CreateInspectionResultDispute.ts`
- Create: `backend/src/modules/inspections/application/ListInspectionResultDisputes.ts`
- Create: `backend/src/modules/inspections/application/ApplyDisputeToDeveloperDataset.ts`
- Create: `backend/src/modules/inspections/application/ReviewInspectionResultDispute.ts`
- Test: `backend/tests/unit/inspections/inspection-result-dispute-service.unit.test.ts`
- Test: `backend/tests/unit/inspections/inspection-result-dispute-use-cases.unit.test.ts`

**Interfaces:**

```ts
export interface InspectionResultDisputeRepository {
  create(input: { inspectionId: string; submittedBy: string; expectedClassification: Inspection["classification"]; reason: string }): Promise<InspectionResultDispute>;
  list(input: { status?: InspectionResultDisputeStatus; inspectionId?: string }): Promise<InspectionResultDispute[]>;
  applyToDeveloperDataset(input: { disputeId: string; actorId: string }): Promise<Inspection>;
  review(input: { disputeId: string; actorId: string; decision: "approved" | "rejected"; reviewerNote: string | null }): Promise<{ dispute: InspectionResultDispute; inspection: Inspection }>;
}
```

- [ ] **Step 1: Write failing service/use-case tests**

Test that submission passes normalized values to the repository, developer application calls only the dataset-application method, approval returns both the reviewed dispute and updated inspection, rejection leaves the official result unchanged, and a repository conflict is surfaced as a conflict error.

- [ ] **Step 2: Run the tests and verify they fail for missing implementations**

Run:

```powershell
npm run test:unit -- tests/unit/inspections/inspection-result-dispute-service.unit.test.ts tests/unit/inspections/inspection-result-dispute-use-cases.unit.test.ts
```

Expected: FAIL because the repository/service/use-case modules do not exist.

- [ ] **Step 3: Implement the repository boundary and minimal use cases**

Keep use cases dependency-injected and free of Express/Supabase details. `CreateInspectionResultDispute` calls `assertDisputeSubmission` before `repository.create`; `ApplyDisputeToDeveloperDataset` delegates only to `repository.applyToDeveloperDataset`; `ReviewInspectionResultDispute` accepts only `approved` or `rejected` and delegates to `repository.review`.

- [ ] **Step 4: Implement Supabase persistence and atomic RPC calls**

Use parameterized Supabase calls. The service should call RPCs with named arguments rather than constructing SQL strings. Add migration functions equivalent to:

```sql
CREATE OR REPLACE FUNCTION public.apply_inspection_dispute_to_developer_dataset(
  p_dispute_id uuid,
  p_actor_id uuid
) RETURNS public.inspections
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_dispute public.inspection_result_disputes;
  v_inspection public.inspections;
BEGIN
  SELECT * INTO v_dispute
  FROM public.inspection_result_disputes
  WHERE id = p_dispute_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'dispute_not_found'; END IF;
  IF v_dispute.status <> 'pending' THEN RAISE EXCEPTION 'dispute_not_pending'; END IF;

  UPDATE public.inspections
  SET manual_classification = v_dispute.expected_classification, updated_at = now()
  WHERE id = v_dispute.inspection_id
  RETURNING * INTO v_inspection;

  UPDATE public.inspection_result_disputes
  SET developer_label_applied_at = now(), developer_label_applied_by = p_actor_id, updated_at = now()
  WHERE id = p_dispute_id;
  RETURN v_inspection;
END;
$$;
```

Add a review function that locks the pending dispute, updates `official_classification` only for approval, updates dispute status/reviewer fields, and returns both rows. The function must reject a second review with a stable error that maps to HTTP `409`.

- [ ] **Step 5: Run service/use-case tests and refactor only after green**

Run the same test command. Expected: PASS. Keep the repository methods small and retain test coverage for the legacy `official_classification = NULL` fallback.

- [ ] **Step 6: Commit the persistence layer**

```powershell
git add backend/src/modules/inspections/domain/ports/InspectionResultDisputeRepository.ts backend/src/modules/inspections/infrastructure/InspectionResultDisputeService.ts backend/src/modules/inspections/application backend/tests/unit/inspections/inspection-result-dispute-service.unit.test.ts backend/tests/unit/inspections/inspection-result-dispute-use-cases.unit.test.ts
git commit -m "feat: add inspection dispute use cases"
```

---

## Task 3: Expose secure inspector and review APIs

**Files:**
- Create: `backend/src/modules/inspections/presentation/controllers/InspectionResultDisputeController.ts`
- Modify: `backend/src/modules/inspections/presentation/routes.ts`
- Modify: `backend/src/types/inspection.ts`
- Modify: `backend/src/modules/inspections/infrastructure/InspectionService.ts`
- Test: `backend/tests/unit/inspections/inspection-result-dispute-controller.unit.test.ts`
- Modify: `backend/tests/architecture/route-registration.architecture.test.ts`

**Interfaces:**

- `POST /api/inspections/:inspectionId/disputes` — authenticated inspector; body `{ expectedClassification, reason }`; returns `201` with the dispute.
- `GET /api/inspections/:inspectionId/disputes` — authenticated owner or admin/developer; returns disputes for the inspection.
- `GET /api/inspections/disputes?status=pending` — admin/developer review queue.
- `PATCH /api/inspections/disputes/:disputeId/review` — admin/developer; body `{ decision: "approved" | "rejected", reviewerNote?: string }`.

- [ ] **Step 1: Write failing controller tests**

Cover missing auth, inaccessible inspection, invalid payload, duplicate pending dispute (`409`), forbidden review, invalid review decision, and successful submission/approval. Assert audit payloads contain actual `toAuditActor` data and IDs.

- [ ] **Step 2: Run the controller tests and verify failure**

```powershell
npm run test:unit -- tests/unit/inspections/inspection-result-dispute-controller.unit.test.ts
```

Expected: FAIL because the controller and routes are not present.

- [ ] **Step 3: Implement controller parsing and authorization**

Use `resolveTrackedRequestAuthContext` for request context, the existing inspection service to verify owner/access for inspector submission, `requireAuthentication`/`requireAdmin`/a new combined admin-or-developer handler as appropriate, and `assertDisputeSubmission` for allowlist/length validation. Never accept actor IDs from request bodies.

Map database errors as follows: duplicate pending → `409`; stale review → `409`; missing inspection/dispute → `404`; invalid input → `400`; auth/role failures → `401`/`403`.

- [ ] **Step 4: Add audit events**

Write `inspection.result_dispute.submit`, `inspection.result_dispute.developer_apply`, `inspection.result_dispute.approve`, and `inspection.result_dispute.reject` through `auditLogService.write`. Include `inspection_id`, `dispute_id`, `previous_classification`, `new_classification`, `reason` where appropriate, and `toAuditActor(accessContext)`.

- [ ] **Step 5: Expose `official_classification` and effective statistics**

Append `official_classification` to `INSPECTION_COLUMNS`. Update `getStatistics` to select both classifications and count `official_classification ?? classification`, while leaving developer metrics’ comparison of original/model versus manual labels unchanged.

- [ ] **Step 6: Register routes and verify tests**

Add routes before `/:id` where path specificity requires it, run:

```powershell
npm run test:unit -- tests/unit/inspections/inspection-result-dispute-controller.unit.test.ts tests/unit/inspections/module-inspection-service.unit.test.ts
npm run test:architecture -- tests/architecture/route-registration.architecture.test.ts
```

Expected: PASS. Commit:

```powershell
git add backend/src/modules/inspections/presentation backend/src/modules/inspections/infrastructure/InspectionService.ts backend/src/types/inspection.ts backend/tests/unit/inspections/inspection-result-dispute-controller.unit.test.ts backend/tests/architecture/route-registration.architecture.test.ts
git commit -m "feat: expose inspection dispute APIs"
```

---

## Task 4: Add developer dashboard dispute operations

**Files:**
- Modify: `backend/src/modules/developer/infrastructure/DeveloperDashboardService.ts`
- Modify: `backend/src/modules/developer/presentation/controllers/DeveloperDashboardController.ts`
- Modify: `backend/src/modules/developer/presentation/dashboard-routes.ts`
- Modify: `backend/src/types/developerDashboard.ts`
- Test: `backend/tests/unit/developer/inspection-disputes.unit.test.ts`

**Interfaces:**

- `GET /api/developer-dashboard/disputes?status=pending` — developer queue.
- `POST /api/developer-dashboard/disputes/:disputeId/apply-to-dataset` — apply expected result to `manual_classification`.
- `PATCH /api/developer-dashboard/disputes/:disputeId/review` — approve/reject official result.

- [ ] **Step 1: Write failing developer service/controller tests**

Test that non-developer requests are blocked by `requireDeveloper`, the apply action updates only the developer dataset result, and the review action returns the approved effective result without changing the original model classification.

- [ ] **Step 2: Run tests and confirm missing endpoint failure**

```powershell
npm run test:unit -- tests/unit/developer/inspection-disputes.unit.test.ts
```

Expected: FAIL because the new service/controller methods and routes do not exist.

- [ ] **Step 3: Implement thin developer-dashboard adapters**

Reuse the inspections dispute use cases/service rather than duplicating Supabase writes. Keep the existing direct manual-classification route intact for explicit curation, but make dispute-driven application require a dispute ID.

- [ ] **Step 4: Run tests and commit**

```powershell
npm run test:unit -- tests/unit/developer/inspection-disputes.unit.test.ts
git add backend/src/modules/developer backend/src/types/developerDashboard.ts backend/tests/unit/developer/inspection-disputes.unit.test.ts
git commit -m "feat: add developer dispute review actions"
```

Expected: PASS.

---

## Task 5: Propagate official/model result types to the frontend

**Files:**
- Modify: `frontend/src/entities/inspection/model/types.ts`
- Create: `frontend/src/entities/inspection/model/result.ts`
- Modify: `frontend/src/entities/inspection/index.ts`
- Modify: `frontend/src/entities/inspection/api/inspection-client.ts`
- Modify: `frontend/src/features/developer-tools/api/developer-dashboard-client.ts`
- Test: `frontend/tests/unit/entities/inspection/result.unit.test.ts`

**Interfaces:**

```ts
export function getEffectiveClassification(inspection: Pick<Inspection, "classification" | "official_classification">): FreshnessClassification;
export function hasOfficialOverride(inspection: Pick<Inspection, "classification" | "official_classification">): boolean;
```

The frontend `Inspection` type gains `official_classification: FreshnessClassification | null` and a dispute type matching the backend response. API clients add `createDispute`, `listDisputes`, `listDeveloperDisputes`, `applyDisputeToDataset`, and `reviewDispute` methods using existing auth headers, CSRF handling, timeout, and error helpers.

- [ ] **Step 1: Write failing effective-result tests**

Assert that a null official result returns the model classification, an official override returns the official classification, and the override predicate is correct.

- [ ] **Step 2: Run the tests and verify failure**

```powershell
npm run test:unit -- tests/unit/entities/inspection/result.unit.test.ts
```

Expected: FAIL because `result.ts` and the new property do not exist.

- [ ] **Step 3: Implement the resolver and API client methods**

Keep the model field intact in all response objects. Use `getEffectiveClassification` only at official display/report boundaries. Do not change the offline SQLite schema in this feature; cached old records resolve to their model result because the optional official field is absent/null.

- [ ] **Step 4: Run frontend typecheck and focused tests**

```powershell
npm run test:unit -- tests/unit/entities/inspection/result.unit.test.ts
npm run typecheck
```

Expected: PASS. Commit:

```powershell
git add frontend/src/entities/inspection frontend/src/features/developer-tools/api/developer-dashboard-client.ts frontend/tests/unit/entities/inspection/result.unit.test.ts
git commit -m "feat: expose official inspection results"
```

---

## Task 6: Add inspector dispute submission UI

**Files:**
- Create: `frontend/src/widgets/inspection-history/ui/dispute-result-form.tsx`
- Modify: `frontend/src/widgets/inspection-history/ui/inspection-detail-sheet.tsx`
- Modify: `frontend/src/widgets/inspection-history/model/use-history.ts`
- Test: `frontend/tests/unit/widgets/inspection-history/dispute-result-form.unit.test.tsx`

**Interfaces:**

```ts
type DisputeResultFormProps = {
  currentClassification: FreshnessClassification;
  isSubmitting: boolean;
  onSubmit: (input: { expectedClassification: FreshnessClassification; reason: string }) => Promise<void>;
  onCancel: () => void;
};
```

- [ ] **Step 1: Write failing form tests**

Test required classification, 10-character minimum reason, 2,000-character maximum, disabled submit while pending, and successful callback payload.

- [ ] **Step 2: Run the form tests and verify failure**

```powershell
npm run test:unit -- tests/unit/widgets/inspection-history/dispute-result-form.unit.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the form and detail-sheet integration**

Add a clearly labeled `Dispute result` action for owned inspector records. Show the effective official result as the main result, and if overridden show the original model result separately. On submit, call the inspection client through the history hook, show pending state, close/reset on success, and display server conflicts/errors through the existing toast pattern.

- [ ] **Step 4: Run focused frontend tests and commit**

```powershell
npm run test:unit -- tests/unit/widgets/inspection-history/dispute-result-form.unit.test.tsx
npm run typecheck
git add frontend/src/widgets/inspection-history frontend/tests/unit/widgets/inspection-history/dispute-result-form.unit.test.tsx
git commit -m "feat: allow inspectors to dispute results"
```

Expected: PASS.

---

## Task 7: Add developer dispute queue, dataset application, and review UI

**Files:**
- Create: `frontend/src/features/developer-tools/ui/disputes-section.tsx`
- Modify: `frontend/src/features/developer-tools/model/use-developer-dashboard.ts`
- Modify: `frontend/src/features/developer-tools/ui/datasets-section.tsx`
- Modify: the existing developer workspace composition file that renders developer tabs
- Create: `frontend/tests/unit/features/developer-tools/disputes-section.unit.test.tsx`

**Interfaces:**

```ts
type DeveloperDisputeActions = {
  applyToDataset: (disputeId: string) => Promise<void>;
  review: (disputeId: string, decision: "approved" | "rejected", reviewerNote?: string) => Promise<void>;
};
```

- [ ] **Step 1: Write failing queue/action tests**

Test that the developer-only queue renders pending disputes, applying a dispute calls the dataset endpoint, approval/rejection calls the review endpoint, and a completed dispute disables duplicate actions.

- [ ] **Step 2: Run tests and verify failure**

```powershell
npm run test:unit -- tests/unit/features/developer-tools/disputes-section.unit.test.tsx
```

Expected: FAIL because the queue component and hook methods do not exist.

- [ ] **Step 3: Implement the hook, queue, and dataset status**

Load disputes only when the developer workspace is active, use optimistic UI only after the API succeeds, refresh the relevant dataset/queue state after actions, and label actions distinctly: `Apply to developer dataset`, `Approve official result`, and `Reject dispute`.

- [ ] **Step 4: Run focused tests and commit**

```powershell
npm run test:unit -- tests/unit/features/developer-tools/disputes-section.unit.test.tsx
npm run typecheck
git add frontend/src/features/developer-tools frontend/tests/unit/features/developer-tools/disputes-section.unit.test.tsx
git commit -m "feat: review disputes in developer dashboard"
```

Expected: PASS.

---

## Task 8: Update official report/history consumers and verify the full feature

**Files:**
- Modify: `frontend/src/widgets/admin-dashboard/model/use-dashboard-report.ts`
- Modify: `frontend/src/widgets/admin-dashboard/ui/inspections-tab.tsx`
- Modify: `frontend/src/entities/inspection/ui/inspection-list-item.tsx`
- Modify: related history summary components identified by typecheck
- Modify: `frontend/src/features/developer-tools/model/api-docs-catalog.ts`
- Test: existing report/history tests plus new regression tests.

- [ ] **Step 1: Write failing regression tests**

Add cases proving official summaries/counts use `official_classification ?? classification`, the model result remains available for developer metrics, and old records with null official values render unchanged.

- [ ] **Step 2: Run the regression tests and verify failure**

```powershell
npm run test:unit -- tests/unit/widgets tests/unit/entities/inspection
```

Expected: FAIL in the new override cases until consumers use the resolver.

- [ ] **Step 3: Update official display/report boundaries**

Use `getEffectiveClassification` for inspector history badges, admin report counts, daily trends, and official summaries. Keep `row.classification` sourced from the original model field and add an explicit effective/official field to report rows where both are needed.

- [ ] **Step 4: Update API documentation metadata**

Add the new inspection and developer-dispute operations to `frontend/src/features/developer-tools/model/api-docs-catalog.ts` with the exact methods, paths, roles, and request bodies.

- [ ] **Step 5: Run the complete verification suite**

Backend:

```powershell
cd backend
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:architecture
npm run build
```

Frontend:

```powershell
cd ..\frontend
npm run typecheck
npm run lint
npm run test:unit
npm run test:architecture
npm run build:dev
```

Expected: all commands pass. If a failure reveals an existing unrelated issue, record it separately and do not weaken the new tests.

- [ ] **Step 6: Review migration and working tree, then commit**

```powershell
cd ..
git diff --check
git diff --name-only master...HEAD
git status --short
git commit -m "test: verify inspection dispute workflow"
```

Confirm the only database change is the new migration and the unrelated untracked letterhead PDF remains untracked.

---

## Plan self-review

- Schema/legacy behavior: Task 1 adds nullable `official_classification` with no backfill.
- Inspector submission: Tasks 2, 3, and 6 cover validation, ownership, API, audit, and UI.
- Developer-only application: Tasks 2, 4, and 7 cover the separate dataset action.
- Admin/developer approval: Tasks 2, 3, 4, and 7 cover atomic review and UI.
- Original model preservation: Tasks 3, 5, and 8 preserve and display `classification` separately.
- Metrics/training safety: Tasks 3, 4, and 8 keep `manual_classification` explicit.
- Audit and security: Task 3 uses the existing auth/CSRF and encrypted audit services.
- Testing: every production change is preceded by a failing focused test and followed by focused/full verification.
- Migration constraint: the plan creates one new migration and never edits an existing migration.
