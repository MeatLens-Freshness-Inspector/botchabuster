# Historical Model Accuracy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store immutable daily model-accuracy snapshots in Supabase and include expected and observed accuracy history in every PDF, CSV, and JSON report.

**Architecture:** Add a dedicated `model-accuracy` backend module backed by two new Supabase tables and a security-definer snapshot function. Link new inspections to registered model versions, expose authenticated history reads and developer-only writes, and feed the resulting snapshots into a shared frontend report section used by administrator and inspector reports.

**Tech Stack:** TypeScript, Node.js/Express, Supabase PostgreSQL/RPC, React Query, React, date-fns, pdfmake, Node test runner, and Vite.

## Global Constraints

- Use a new forward-only migration under `backend/supabase/migrations/`.
- Expected accuracy is immutable per model version; a revised model or benchmark receives a new version key.
- Observed accuracy counts only inspections with non-null `official_classification`.
- Snapshots represent the previous UTC calendar day and are append-only and idempotent.
- Legacy inspections without a model version remain valid and are excluded from version-specific observed accuracy.
- Model registration and snapshot creation are developer-only; snapshot reads require authentication.
- Use explicit Supabase projections and bounded date ranges.
- Include historical accuracy in PDF, CSV, and JSON report outputs.
- Follow TDD: write each behavior test, run it failing, implement the minimum behavior, then run the focused and broader suites.
- Do not stage or modify the pre-existing `frontend/tests/unit/utilities/shared-date-storage.unit.test.ts` change.

---

## File Map

### Backend

- Create `backend/supabase/migrations/20260826180000_add_model_accuracy_history.sql` for the schema, constraints, RLS, RPCs, and indexes.
- Create `backend/src/modules/model-accuracy/domain/modelAccuracy.ts` for validated domain types and response shapes.
- Create `backend/src/modules/model-accuracy/domain/ports/ModelAccuracyRepository.ts` for the persistence contract.
- Create `backend/src/modules/model-accuracy/application/RegisterModelVersion.ts`, `GetModelAccuracyHistory.ts`, and `CaptureModelAccuracySnapshots.ts` for one-operation use cases.
- Create `backend/src/modules/model-accuracy/infrastructure/SupabaseModelAccuracyRepository.ts` and `SupabaseModelAccuracyFactory.ts` for Supabase access.
- Create `backend/src/modules/model-accuracy/presentation/controllers/ModelAccuracyController.ts` and `presentation/routes.ts` for HTTP parsing, auth context, and status mapping.
- Create `backend/src/modules/model-accuracy/index.ts` as the module composition surface.
- Modify `backend/src/bootstrap/routes.ts` to mount `/api/model-accuracy`.
- Modify `backend/src/modules/inspections/infrastructure/InspectionService.ts` to resolve and persist `model_version_id` during new inspection creation.
- Modify `backend/src/types/inspection.ts` to expose the optional submission-side `model_version_key` and persisted `model_version_id`.
- Create `backend/src/jobs/captureModelAccuracySnapshots.ts` and modify `backend/package.json` and `render.yaml` for the daily previous-day scheduler.
- Modify `documentation/API_REFERENCE.md` and `documentation/backend/folder-structure.md` to document the new module and routes.

### Frontend

- Create `frontend/src/entities/model-accuracy/model/types.ts`, `api/model-accuracy-client.ts`, `model/queries.ts`, and `index.ts` for typed history reads.
- Modify `frontend/src/entities/inspection/model/types.ts` and `model/mutations.ts` to carry model-version identity through inspection submission.
- Modify `frontend/src/features/offline-analysis/lib/model-catalog.ts`, `lib/analysis-runtime.ts`, and the model runtime result types to emit a stable model version key.
- Modify offline sync payload construction so queued inspections retain that key.
- Modify `frontend/src/widgets/admin-dashboard/model/use-dashboard-report.ts` and `use-admin-dashboard.ts` to load range snapshots and pass them to all admin report exports.
- Modify `frontend/src/widgets/history/model/use-history.ts`, `model/history-page.ts`, and `model/types.ts` to load selected-day snapshots for inspector PDFs.
- Modify `frontend/src/features/reports/model/types.ts` to add the shared snapshot input.
- Create `frontend/src/features/reports/lib/model-accuracy-section.ts` and modify both report adapters to include the shared section.
- Modify `frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts` to include the same history in CSV and JSON exports.

### Tests

- Create `backend/tests/unit/infrastructure/model-accuracy-migration.unit.test.ts`.
- Create `backend/tests/unit/model-accuracy/model-accuracy-domain.unit.test.ts`, `model-accuracy-use-cases.unit.test.ts`, `supabase-model-accuracy-repository.unit.test.ts`, and `model-accuracy-router.unit.test.ts`.
- Modify `backend/tests/unit/inspections/module-inspection-service.unit.test.ts` and add model-version assertions.
- Create `backend/tests/integration/model-accuracy/model-accuracy-api.integration.test.ts`.
- Create `frontend/tests/unit/entities/model-accuracy-client.unit.test.ts`, `frontend/tests/unit/features/reports/model-accuracy-section.unit.test.ts`, and `frontend/tests/unit/features/offline-analysis/model-version.unit.test.ts`.
- Modify existing admin-range, inspector-daily, history-PDF, admin-PDF, and report export tests for snapshot inclusion.

---

### Task 1: Add the database migration and domain contracts

**Files:**
- Create: `backend/supabase/migrations/20260826180000_add_model_accuracy_history.sql`
- Create: `backend/src/modules/model-accuracy/domain/modelAccuracy.ts`
- Create: `backend/src/modules/model-accuracy/domain/ports/ModelAccuracyRepository.ts`
- Test: `backend/tests/unit/infrastructure/model-accuracy-migration.unit.test.ts`
- Test: `backend/tests/unit/model-accuracy/model-accuracy-domain.unit.test.ts`

**Interfaces:**
- Produces `ModelVersion`, `ModelAccuracySnapshot`, `RegisterModelVersionInput`, and `ModelAccuracyHistoryQuery` types.
- Produces `ModelAccuracyRepository` methods: `registerModelVersion`, `getHistory`, and `captureSnapshots`.

- [ ] **Step 1: Write the failing migration contract test**

```ts
test("model accuracy migration creates versioned immutable daily snapshots", () => {
  const sql = readFileSync(migrationPath, "utf8").toLowerCase();

  assert.match(sql, /create table if not exists public\.model_versions/);
  assert.match(sql, /expected_accuracy numeric\(5,4\)/);
  assert.match(sql, /create table if not exists public\.model_accuracy_snapshots/);
  assert.match(sql, /add column if not exists model_version_id/);
  assert.match(sql, /unique \(model_version_id, snapshot_date\)/);
  assert.match(sql, /correct_count <= evaluated_count/);
  assert.match(sql, /official_classification is not null/);
  assert.match(sql, /on conflict \(model_version_id, snapshot_date\) do nothing/);
  assert.match(sql, /capture_model_accuracy_snapshots/);
  assert.match(sql, /enable row level security/);
});
```

- [ ] **Step 2: Run the migration test and verify the expected failure**

Run: `npm run test:unit --prefix backend -- tests/unit/infrastructure/model-accuracy-migration.unit.test.ts -t "model accuracy migration"`

Expected: FAIL because the migration file and its database objects do not exist.

- [ ] **Step 3: Write the migration**

Use these database rules in `20260826180000_add_model_accuracy_history.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_key text NOT NULL UNIQUE CHECK (char_length(btrim(version_key)) BETWEEN 1 AND 200),
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 200),
  expected_accuracy numeric(5,4) NOT NULL CHECK (expected_accuracy BETWEEN 0 AND 1),
  active_from timestamptz NOT NULL,
  retired_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (retired_at IS NULL OR retired_at > active_from)
);

ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS model_version_id uuid REFERENCES public.model_versions(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS public.model_accuracy_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version_id uuid NOT NULL REFERENCES public.model_versions(id) ON DELETE RESTRICT,
  snapshot_date date NOT NULL,
  expected_accuracy numeric(5,4) NOT NULL CHECK (expected_accuracy BETWEEN 0 AND 1),
  evaluated_count integer NOT NULL CHECK (evaluated_count >= 0),
  correct_count integer NOT NULL CHECK (correct_count >= 0 AND correct_count <= evaluated_count),
  observed_accuracy numeric(5,4) CHECK (observed_accuracy IS NULL OR observed_accuracy BETWEEN 0 AND 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model_version_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS inspections_model_version_created_id_idx
  ON public.inspections (model_version_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS model_accuracy_snapshots_date_version_idx
  ON public.model_accuracy_snapshots (snapshot_date DESC, model_version_id);

ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_accuracy_snapshots ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.capture_model_accuracy_snapshots(
  p_snapshot_date date DEFAULT ((timezone('utc', now()))::date - 1)
)
RETURNS SETOF public.model_accuracy_snapshots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz := p_snapshot_date::timestamptz;
  v_end timestamptz := (p_snapshot_date + 1)::timestamptz;
BEGIN
  IF p_snapshot_date > (timezone('utc', now()))::date THEN
    RAISE EXCEPTION 'snapshot_date_cannot_be_in_future';
  END IF;

  RETURN QUERY
  WITH eligible_versions AS (
    SELECT mv.id, mv.expected_accuracy
    FROM public.model_versions AS mv
    WHERE mv.active_from < v_end
      AND (mv.retired_at IS NULL OR mv.retired_at >= v_start)
  ), aggregates AS (
    SELECT
      i.model_version_id,
      count(*) FILTER (WHERE i.official_classification IS NOT NULL)::integer AS evaluated_count,
      count(*) FILTER (
        WHERE i.official_classification IS NOT NULL
          AND i.classification = i.official_classification
      )::integer AS correct_count
    FROM public.inspections AS i
    WHERE i.created_at >= v_start
      AND i.created_at < v_end
    GROUP BY i.model_version_id
  ), inserted AS (
    INSERT INTO public.model_accuracy_snapshots (
      model_version_id, snapshot_date, expected_accuracy,
      evaluated_count, correct_count, observed_accuracy
    )
    SELECT
      v.id,
      p_snapshot_date,
      v.expected_accuracy,
      COALESCE(a.evaluated_count, 0),
      COALESCE(a.correct_count, 0),
      CASE WHEN COALESCE(a.evaluated_count, 0) = 0 THEN NULL
           ELSE a.correct_count::numeric / a.evaluated_count END
    FROM eligible_versions AS v
    LEFT JOIN aggregates AS a ON a.model_version_id = v.id
    ON CONFLICT (model_version_id, snapshot_date) DO NOTHING
    RETURNING *
  )
  SELECT * FROM inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_model_accuracy_snapshots(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.capture_model_accuracy_snapshots(date) TO service_role;
```

Use a controlled service-role projection for authenticated backend reads, and grant only `service_role` on the new tables. Keep expected accuracy immutable by omitting update endpoints and adding a database trigger that rejects changes to `version_key`, `display_name`, `expected_accuracy`, and `active_from`.

- [ ] **Step 4: Add domain types and validation tests**

```ts
export interface ModelVersion {
  id: string;
  versionKey: string;
  displayName: string;
  expectedAccuracy: number;
  activeFrom: string;
  retiredAt: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface ModelAccuracySnapshot {
  id: string;
  modelVersionId: string;
  versionKey: string;
  displayName: string;
  snapshotDate: string;
  expectedAccuracy: number;
  observedAccuracy: number | null;
  evaluatedCount: number;
  correctCount: number;
  createdAt: string;
}

export interface RegisterModelVersionInput {
  versionKey: string;
  displayName: string;
  expectedAccuracy: number;
  activeFrom: string;
  createdBy: string;
}

export interface ModelAccuracyHistoryQuery {
  startDate: string;
  endDate: string;
}

export interface ModelAccuracyRepository {
  registerModelVersion(input: RegisterModelVersionInput): Promise<ModelVersion>;
  getHistory(query: ModelAccuracyHistoryQuery): Promise<ModelAccuracySnapshot[]>;
  captureSnapshots(snapshotDate: string): Promise<ModelAccuracySnapshot[]>;
}
```

Test that expected accuracy accepts `0` and `1`, rejects `-0.01`, `1.01`, `NaN`, and non-finite values; dates must be `YYYY-MM-DD` for query/snapshot dates and valid ISO datetimes for `activeFrom`.

- [ ] **Step 5: Run focused tests and commit**

Run: `npm run test:unit --prefix backend -- tests/unit/infrastructure/model-accuracy-migration.unit.test.ts tests/unit/model-accuracy/model-accuracy-domain.unit.test.ts`

Expected: PASS with the migration assertions and domain validation covered.

Commit: `git add -f backend/supabase/migrations/20260826180000_add_model_accuracy_history.sql backend/src/modules/model-accuracy backend/tests/unit/infrastructure/model-accuracy-migration.unit.test.ts backend/tests/unit/model-accuracy/model-accuracy-domain.unit.test.ts && git commit -m "feat: add model accuracy snapshot schema"`

### Task 2: Implement model-accuracy persistence, use cases, and routes

**Files:**
- Create: `backend/src/modules/model-accuracy/infrastructure/SupabaseModelAccuracyRepository.ts`
- Create: `backend/src/modules/model-accuracy/infrastructure/SupabaseModelAccuracyFactory.ts`
- Create: `backend/src/modules/model-accuracy/application/RegisterModelVersion.ts`
- Create: `backend/src/modules/model-accuracy/application/GetModelAccuracyHistory.ts`
- Create: `backend/src/modules/model-accuracy/application/CaptureModelAccuracySnapshots.ts`
- Create: `backend/src/modules/model-accuracy/presentation/controllers/ModelAccuracyController.ts`
- Create: `backend/src/modules/model-accuracy/presentation/routes.ts`
- Create: `backend/src/modules/model-accuracy/index.ts`
- Modify: `backend/src/bootstrap/routes.ts`
- Test: `backend/tests/unit/model-accuracy/supabase-model-accuracy-repository.unit.test.ts`
- Test: `backend/tests/unit/model-accuracy/model-accuracy-use-cases.unit.test.ts`
- Test: `backend/tests/unit/model-accuracy/model-accuracy-router.unit.test.ts`
- Test: `backend/tests/integration/model-accuracy/model-accuracy-api.integration.test.ts`

**Interfaces:**
- `GET /api/model-accuracy/history?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` returns `ModelAccuracySnapshot[]` for authenticated users.
- `POST /api/model-accuracy/versions` accepts `{ versionKey, displayName, expectedAccuracy, activeFrom }` and requires developer access.
- `POST /api/model-accuracy/snapshots` accepts `{ snapshotDate?: "YYYY-MM-DD" }`, defaults to the previous UTC date, and requires developer access.

- [ ] **Step 1: Write repository and use-case failing tests**

Use a real fake RPC client that records function names and arguments. Assert that reads call an explicit projection and bounded date arguments, registration trims strings and passes `created_by`, and capture maps a null RPC result to an empty list.

```ts
test("history use case rejects a reversed date range before querying", async () => {
  const repository = new RecordingModelAccuracyRepository();
  const query = new GetModelAccuracyHistory(repository);

  await assert.rejects(
    query.execute({ startDate: "2026-08-27", endDate: "2026-08-26" }),
    /startDate must be on or before endDate/i,
  );
  assert.equal(repository.historyCalls.length, 0);
});
```

- [ ] **Step 2: Run focused tests and verify the expected failure**

Run: `npm run test:unit --prefix backend -- tests/unit/model-accuracy/supabase-model-accuracy-repository.unit.test.ts tests/unit/model-accuracy/model-accuracy-use-cases.unit.test.ts`

Expected: FAIL because the repository and use-case files do not exist.

- [ ] **Step 3: Implement the repository and use cases**

The repository must use explicit columns and RPC calls equivalent to:

```ts
const SNAPSHOT_COLUMNS =
  "id, model_version_id, snapshot_date, expected_accuracy, observed_accuracy, evaluated_count, correct_count, created_at, model_versions!inner(version_key, display_name)";

async getHistory(query: ModelAccuracyHistoryQuery): Promise<ModelAccuracySnapshot[]> {
  const { data, error } = await this.client
    .from("model_accuracy_snapshots")
    .select(SNAPSHOT_COLUMNS)
    .gte("snapshot_date", query.startDate)
    .lte("snapshot_date", query.endDate);
  if (error) throw new Error(`Failed to fetch model accuracy history: ${error.message}`);
  return (data ?? [])
    .map(mapSnapshotRow)
    .sort((left, right) =>
      left.snapshotDate.localeCompare(right.snapshotDate) ||
      left.versionKey.localeCompare(right.versionKey),
    );
}
```

Registration inserts into `model_versions` and maps duplicate-key errors to `Model version key already exists`. Capture calls `capture_model_accuracy_snapshots` with the date and maps numeric database values to finite numbers or `null`.

- [ ] **Step 4: Implement controller and route authorization**

Use `requireAuthentication` for the history route and `requireDeveloper` for both write routes. Parse and validate dates before invoking use cases; reject ranges over 366 days with HTTP 400. Return 201 for a new model version, 200 for history/snapshot capture, 400 for validation/database constraint errors, 401 for missing auth, and 403 for non-developers.

- [ ] **Step 5: Mount the route and run tests**

Add `{ prefix: "/api/model-accuracy", router: modelAccuracyRoutes }` to `createBackendRoutes`.

Run: `npm run test:unit --prefix backend -- tests/unit/model-accuracy`

Expected: PASS.

Run: `npm run test:integration --prefix backend -- tests/integration/model-accuracy/model-accuracy-api.integration.test.ts`

Expected: PASS for authenticated read, developer-only registration/capture, date validation, and non-developer rejection.

- [ ] **Step 6: Commit**

Commit: `git add backend/src/modules/model-accuracy backend/src/bootstrap/routes.ts backend/tests/unit/model-accuracy backend/tests/integration/model-accuracy && git commit -m "feat: expose model accuracy history APIs"`

### Task 3: Associate inspections with the active model version

**Files:**
- Modify: `backend/src/types/inspection.ts`
- Modify: `backend/src/modules/inspections/infrastructure/InspectionService.ts`
- Modify: `frontend/src/entities/inspection/model/types.ts`
- Modify: `frontend/src/entities/inspection/model/mutations.ts`
- Modify: `frontend/src/features/offline-analysis/lib/model-catalog.ts`
- Modify: `frontend/src/features/offline-analysis/lib/analysis-runtime.ts`
- Modify: `frontend/src/features/offline-analysis/api/analyze-inspection.ts`
- Modify: `frontend/src/features/offline-sync/model/inspection-queue.ts`
- Modify: `frontend/src/features/offline-sync/ui/offline-sync-manager.tsx`
- Test: `backend/tests/unit/inspections/module-inspection-service.unit.test.ts`
- Test: `frontend/tests/unit/features/offline-analysis/model-version.unit.test.ts`
- Test: `frontend/tests/unit/features/inspection-submission/inspection-mutation.unit.test.ts`

**Interfaces:**
- `InspectionInsert.model_version_key?: string | null` is the client-facing stable key.
- Persisted `Inspection.model_version_id?: string | null` is returned by the backend.
- `AnalysisResult.model_version_key?: string | null` is copied into the inspection insert.
- `getActiveAnalysisModelVersionKey(): string` returns the key for the active MobileNet, ResNet, or ensemble selection.

- [ ] **Step 1: Write failing propagation tests**

```ts
test("inspection insert carries the model version key from the analysis result", () => {
  const insert = buildInspectionInsert({
    userId: "user-1",
    submissionId: "submission-1",
    capturedAt: "2026-08-26T00:00:00.000Z",
    location: null,
    coordinates: null,
    decisionSource: "ai",
    preScanForm: emptyPreScanForm(),
    result: {
      classification: "fresh",
      confidence_score: 0.91,
      model_version_key: "mobilenet-primary-2026-08-13",
      flagged_deviations: [],
      explanation: "ok",
    },
  });

  assert.equal(insert.model_version_key, "mobilenet-primary-2026-08-13");
});
```

Also assert each catalog entry has a stable key and changing the selected model changes the returned key.

- [ ] **Step 2: Run focused tests and verify the expected failure**

Run: `npm run test:unit --prefix frontend -- tests/unit/features/offline-analysis/model-version.unit.test.ts tests/unit/features/inspection-submission/inspection-mutation.unit.test.ts`

Expected: FAIL because result types and model-version propagation do not exist.

- [ ] **Step 3: Add stable catalog keys and propagate runtime identity**

Add explicit `versionKey` values to all catalog entries, including `ensemble`. Add `modelVersionKey` to `ActiveAnalysisPrediction`, derive it from `getActiveAnalysisModelVersionKey()`, and include it in the object returned by `analyzeInspection` as `model_version_key`.

Do not derive identity from a fallback asset path. The catalog key is the deployment contract that must be registered in `model_versions` before release.

- [ ] **Step 4: Resolve and persist the key in `InspectionService`**

Before inserting an inspection with `model_version_key`, query `model_versions` using the exact key and explicit projection `id, version_key`. Throw `Model version is not registered` when absent. Add `model_version_id` to the insert payload and `INSPECTION_COLUMNS`; leave it null when the key is absent for legacy compatibility.

- [ ] **Step 5: Preserve the key in offline sync and verify**

Include `model_version_key` in the queued scan shape and in the payload built by `offline-sync-manager.tsx`. Run:

```text
npm run test:unit --prefix backend -- tests/unit/inspections/module-inspection-service.unit.test.ts
npm run test:unit --prefix frontend -- tests/unit/features/offline-analysis/model-version.unit.test.ts tests/unit/features/inspection-submission/inspection-mutation.unit.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Commit: `git add backend/src/types/inspection.ts backend/src/modules/inspections/infrastructure/InspectionService.ts frontend/src/entities/inspection frontend/src/features/offline-analysis frontend/src/features/offline-sync backend/tests/unit/inspections/module-inspection-service.unit.test.ts frontend/tests/unit/features/offline-analysis/model-version.unit.test.ts frontend/tests/unit/features/inspection-submission/inspection-mutation.unit.test.ts && git commit -m "feat: attribute inspections to model versions"`

### Task 4: Add the frontend history client and load snapshots for reports

**Files:**
- Create: `frontend/src/entities/model-accuracy/model/types.ts`
- Create: `frontend/src/entities/model-accuracy/api/model-accuracy-client.ts`
- Create: `frontend/src/entities/model-accuracy/model/queries.ts`
- Create: `frontend/src/entities/model-accuracy/index.ts`
- Modify: `frontend/src/widgets/admin-dashboard/model/use-dashboard-report.ts`
- Modify: `frontend/src/widgets/history/model/use-history.ts`
- Modify: `frontend/src/widgets/history/model/types.ts`
- Test: `frontend/tests/unit/entities/model-accuracy-client.unit.test.ts`
- Test: `frontend/tests/unit/widgets/admin-dashboard/model-accuracy-report-query.unit.test.ts`

**Interfaces:**
- `modelAccuracyClient.getHistory(startDate: string, endDate: string): Promise<ModelAccuracySnapshot[]>`.
- `useModelAccuracyHistory(startDate: string, endDate: string)` returns a React Query result keyed by `modelAccuracyKeys.history(startDate, endDate)`.
- `useDashboardReport` returns `modelAccuracyHistory` for the selected admin range.
- `useHistory` passes selected-day snapshots into `buildDetailedHistoryReportPdfModel`.

- [ ] **Step 1: Write the failing client and query tests**

Assert that the client requests `/api/model-accuracy/history?startDate=2026-08-01&endDate=2026-08-31`, sends auth headers, throws the existing formatted API error on non-2xx responses, and returns the decoded snapshot list. Assert that query keys include both dates.

- [ ] **Step 2: Run focused tests and verify the expected failure**

Run: `npm run test:unit --prefix frontend -- tests/unit/entities/model-accuracy-client.unit.test.ts tests/unit/widgets/admin-dashboard/model-accuracy-report-query.unit.test.ts`

Expected: FAIL because the client, query key, and hook do not exist.

- [ ] **Step 3: Implement the client and query hook**

Use the existing `API_BASE_URL`, `createAuthHeaders`, `fetchWithTimeout`, and 401 notification conventions from `inspection-client.ts`. Normalize and validate the response so `observedAccuracy` is either a finite number or `null`, and reject malformed counts or dates.

- [ ] **Step 4: Wire admin and inspector date ranges**

In `useDashboardReport`, call `useModelAccuracyHistory(reportStartDate, reportEndDate)` and return an empty list while loading/error. In `useHistory`, call the same hook with `selectedReportDay` for both dates and pass the resulting list to the detailed report model. Do not block existing inspection history rendering when the snapshot request fails; show a report empty state instead.

- [ ] **Step 5: Run focused tests and commit**

Run:

```text
npm run test:unit --prefix frontend -- tests/unit/entities/model-accuracy-client.unit.test.ts tests/unit/widgets/admin-dashboard/model-accuracy-report-query.unit.test.ts
npm run typecheck --prefix frontend
```

Expected: PASS.

Commit: `git add frontend/src/entities/model-accuracy frontend/src/widgets/admin-dashboard/model/use-dashboard-report.ts frontend/src/widgets/history/model/use-history.ts frontend/src/widgets/history/model/types.ts frontend/tests/unit/entities/model-accuracy-client.unit.test.ts frontend/tests/unit/widgets/admin-dashboard/model-accuracy-report-query.unit.test.ts && git commit -m "feat: load model accuracy history for reports"`

### Task 5: Add a shared historical-accuracy report section to PDF models

**Files:**
- Modify: `frontend/src/features/reports/model/types.ts`
- Create: `frontend/src/features/reports/lib/model-accuracy-section.ts`
- Modify: `frontend/src/features/reports/lib/adapters/admin-range-report.ts`
- Modify: `frontend/src/features/reports/lib/adapters/inspector-daily-report.ts`
- Modify: `frontend/src/widgets/admin-dashboard/lib/dashboard.ts`
- Modify: `frontend/src/widgets/history/model/history-page.ts`
- Test: `frontend/tests/unit/features/reports/model-accuracy-section.unit.test.ts`
- Modify: `frontend/tests/unit/domain/analysis/admin-range-report-adapter.unit.test.ts`
- Modify: `frontend/tests/unit/domain/analysis/inspector-daily-report-adapter.unit.test.ts`
- Modify: `frontend/tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts`
- Modify: `frontend/tests/unit/domain/analysis/history-report-pdf-export.unit.test.ts`

**Interfaces:**
- `buildModelAccuracySection(history: readonly ModelAccuracySnapshot[]): ReportSection`.
- `BuildAdminRangeReportInput.modelAccuracyHistory?: ModelAccuracySnapshot[]`.
- `BuildInspectorDailyReportInput.modelAccuracyHistory?: ModelAccuracySnapshot[]`.
- Every returned `ReportDocumentModel` includes the shared section, including an empty state when history is absent.

- [ ] **Step 1: Write the failing section and adapter tests**

```ts
test("historical accuracy section compares expected and observed accuracy", () => {
  const section = buildModelAccuracySection([{
    id: "snapshot-1",
    modelVersionId: "model-1",
    versionKey: "mobilenet-primary-2026-08-13",
    displayName: "Primary MobileNetV3",
    snapshotDate: "2026-08-25",
    expectedAccuracy: 0.92,
    observedAccuracy: 0.875,
    evaluatedCount: 16,
    correctCount: 14,
    createdAt: "2026-08-26T00:10:00.000Z",
  }]);

  assert.deepEqual(section.tables?.[0]?.columns, [
    "Date", "Model Version", "Expected", "Observed", "Evaluated", "Correct",
  ]);
  assert.equal(section.charts?.[0]?.series?.length, 2);
  assert.match(section.tables?.[0]?.rows[0]?.[3] ?? "", /87\.5%/);
});
```

Also assert zero evaluated records render `Unavailable` and that both admin and inspector adapters include a section with id `model-accuracy-history`.

- [ ] **Step 2: Run focused tests and verify the expected failure**

Run: `npm run test:unit --prefix frontend -- tests/unit/features/reports/model-accuracy-section.unit.test.ts tests/unit/domain/analysis/admin-range-report-adapter.unit.test.ts tests/unit/domain/analysis/inspector-daily-report-adapter.unit.test.ts`

Expected: FAIL because the section and input fields do not exist.

- [ ] **Step 3: Implement the shared section**

Build a table ordered by `snapshotDate`, then `versionKey`, with percent values formatted through the report formatter. Build a line chart whose series are `Expected Accuracy` and `Observed Accuracy`; multiply unit metrics by 100 for chart values. Use `Unavailable` for null observed accuracy and `No finalized model accuracy snapshots for this period` for an empty history.

- [ ] **Step 4: Wire both adapters and callers**

Append the shared section to the admin range report after the overview and to the inspector daily report after the shared summary. Pass the loaded snapshot list from `useDashboardReport` and `useHistory` through `dashboard.ts` and `history-page.ts`.

- [ ] **Step 5: Verify PDF document output**

Update the existing PDF document tests to assert the generated document content includes `Historical Model Accuracy`, `Expected Accuracy`, and `Observed Accuracy`, while preserving the existing report template and image behavior.

Run: `npm run test:unit --prefix frontend -- tests/unit/features/reports/model-accuracy-section.unit.test.ts tests/unit/domain/analysis/admin-range-report-adapter.unit.test.ts tests/unit/domain/analysis/inspector-daily-report-adapter.unit.test.ts tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts tests/unit/domain/analysis/history-report-pdf-export.unit.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

Commit: `git add frontend/src/features/reports frontend/src/widgets/admin-dashboard/lib/dashboard.ts frontend/src/widgets/history/model/history-page.ts frontend/tests/unit/features/reports/model-accuracy-section.unit.test.ts frontend/tests/unit/domain/analysis/admin-range-report-adapter.unit.test.ts frontend/tests/unit/domain/analysis/inspector-daily-report-adapter.unit.test.ts frontend/tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts frontend/tests/unit/domain/analysis/history-report-pdf-export.unit.test.ts && git commit -m "feat: include historical accuracy in PDF reports"`

### Task 6: Include history in CSV and JSON exports

**Files:**
- Modify: `frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts`
- Modify: `frontend/tests/unit/widgets/admin-dashboard/reports-ui.unit.test.ts`
- Modify: `frontend/tests/unit/features/reports/public-api.unit.test.ts`

**Interfaces:**
- CSV exports contain a `Historical Model Accuracy` block after inspection rows and before developer analytics.
- JSON exports contain `modelAccuracyHistory` at the top level beside `dailyTrend` and `inspections`.

- [ ] **Step 1: Write the failing export assertions**

Assert CSV headers/rows include `Snapshot Date,Model Version,Expected Accuracy,Observed Accuracy,Evaluated Count,Correct Count`, and JSON includes the exact snapshot objects returned by the history query. Assert null observed accuracy serializes as `null` in JSON and `Unavailable` in CSV.

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `npm run test:unit --prefix frontend -- tests/unit/widgets/admin-dashboard/reports-ui.unit.test.ts`

Expected: FAIL because the export handlers do not include the new block.

- [ ] **Step 3: Implement the export blocks**

Use `modelAccuracyHistory` from `reportState`. Keep existing inspection and developer columns unchanged. Add the CSV block only after the inspection rows, and add `modelAccuracyHistory` to the JSON payload even for non-developer exports.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm run test:unit --prefix frontend -- tests/unit/widgets/admin-dashboard/reports-ui.unit.test.ts tests/unit/features/reports/public-api.unit.test.ts`

Expected: PASS.

Commit: `git add frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts frontend/tests/unit/widgets/admin-dashboard/reports-ui.unit.test.ts frontend/tests/unit/features/reports/public-api.unit.test.ts && git commit -m "feat: include historical accuracy in data exports"`

### Task 7: Add the daily scheduler and documentation

**Files:**
- Create: `backend/src/jobs/captureModelAccuracySnapshots.ts`
- Modify: `backend/package.json`
- Modify: `render.yaml`
- Modify: `documentation/API_REFERENCE.md`
- Modify: `documentation/backend/folder-structure.md`
- Test: `backend/tests/unit/model-accuracy/model-accuracy-scheduler.unit.test.ts`

**Interfaces:**
- `npm run capture:model-accuracy --prefix backend` invokes the service-role RPC for the previous UTC date.
- Render runs the command daily at `00:10 UTC` after building the backend.

- [ ] **Step 1: Write the failing scheduler test**

Assert the job calls `capture_model_accuracy_snapshots` with `(UTC today - 1 day)` and exits with a nonzero status when the RPC fails.

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `npm run test:unit --prefix backend -- tests/unit/model-accuracy/model-accuracy-scheduler.unit.test.ts`

Expected: FAIL because the job does not exist.

- [ ] **Step 3: Implement the service-role job and Render cron service**

Add a small job entry point that imports the configured Supabase client, computes the previous UTC date, invokes the RPC, logs the number of inserted snapshots, and sets `process.exitCode = 1` on failure. Add the package script:

```json
"capture:model-accuracy": "node dist/jobs/captureModelAccuracySnapshots.js"
```

Add a Render cron service with `schedule: "10 0 * * *"`, `buildCommand: "npm ci && npm run build"`, and `startCommand: "npm run capture:model-accuracy"`, sharing the existing Supabase environment variables.

- [ ] **Step 4: Document registration, APIs, and operation**

Document the three routes, previous-day UTC behavior, official-label rule, model key deployment sequence, and legacy-row behavior in `documentation/API_REFERENCE.md`. Add the module and migration to `documentation/backend/folder-structure.md`.

- [ ] **Step 5: Run focused tests and commit**

Run: `npm run test:unit --prefix backend -- tests/unit/model-accuracy/model-accuracy-scheduler.unit.test.ts`

Expected: PASS.

Commit: `git add backend/src/jobs/captureModelAccuracySnapshots.ts backend/package.json render.yaml documentation/API_REFERENCE.md documentation/backend/folder-structure.md backend/tests/unit/model-accuracy/model-accuracy-scheduler.unit.test.ts && git commit -m "ops: schedule daily model accuracy snapshots"`

### Task 8: Full verification and completion review

**Files:**
- Verify all files from Tasks 1–7.
- Do not modify unrelated existing changes.

- [ ] **Step 1: Run backend typecheck and complete backend suite**

Run:

```text
npm run typecheck --prefix backend
npm test --prefix backend
```

Expected: both commands exit 0 with no failing tests.

- [ ] **Step 2: Run frontend typecheck, lint, and focused report suite**

Run:

```text
npm run typecheck --prefix frontend
npm run lint --prefix frontend
npm run test:unit --prefix frontend -- tests/unit/entities/model-accuracy-client.unit.test.ts tests/unit/features/reports tests/unit/domain/analysis/admin-range-report-adapter.unit.test.ts tests/unit/domain/analysis/inspector-daily-report-adapter.unit.test.ts tests/unit/widgets/admin-dashboard/reports-ui.unit.test.ts
```

Expected: all commands exit 0.

- [ ] **Step 3: Run repository build and migration diff checks**

Run:

```text
npm run build:backend
git diff --check origin/master...HEAD
git status --short
```

Expected: backend build exits 0, diff check emits no whitespace errors, and status shows only the pre-existing `frontend/tests/unit/utilities/shared-date-storage.unit.test.ts` modification if it was not changed by the implementation.

- [ ] **Step 4: Review requirements against evidence**

Confirm from code/tests that:

1. A new migration exists and creates both tables, the inspection link, constraints, indexes, RLS, and capture RPC.
2. New model versions can be registered with expected accuracy and cannot mutate historical values.
3. New inspections carry the active model version key.
4. Daily snapshots are previous-day UTC, official-label-only, append-only, and idempotent.
5. Authenticated history reads work and developer-only writes are protected.
6. Admin range and inspector daily PDF reports include the historical section.
7. Admin CSV and JSON exports include the same history.

- [ ] **Step 5: Commit any final test-only adjustments separately**

If verification reveals a test defect, add a focused test-first fix commit with a message describing the behavior. Do not amend earlier commits or stage unrelated user changes.
