# Model Calibration Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add trustworthy controlled calibration analytics, separate field-confidence monitoring, and training-pipeline calibration package generation to MeatLens.

**Architecture:** Extend the existing `model-accuracy` backend module with immutable imported evaluation rows, pure TypeScript metric functions, and one developer/admin analytics API. `meatlens-training-2` produces a versioned ZIP containing a manifest and JSONL prediction rows; it never sends raw images or training data. The existing Overview tab consumes the analytics response and keeps its current dispute statistics intact.

**Tech Stack:** TypeScript, Express, Supabase migrations/RLS, React, TanStack Query, Recharts, existing MeatLens Card/Table/Chart primitives, Python, pandas, NumPy, scikit-learn, pytest, Node test runner, Vite, Playwright.

## Global Constraints

- Use ten equal-width confidence bins: `[0.0, 0.1)`, ..., `[0.9, 1.0]`.
- The final confidence bin includes `1.0`; all other bins are left-inclusive and right-exclusive.
- Never use undisputed production predictions as calibration ground truth.
- Never label production dispute statistics as model accuracy.
- Preserve original inspection classification, confidence, model identity, and dispute history.
- Do not store raw training datasets or images in the application database.
- Do not redesign the existing Overview Dashboard dispute section.
- Reuse existing transport upload, authentication, RLS, audit-log, report, chart, loading, and empty-state conventions.
- Keep existing tests and quality gates intact.
- Do not add a dependency unless an existing dependency cannot satisfy the requirement.
- Run the smallest affected checks after every edit, then the complete relevant local CI lanes before completion.
- Produce at least 20 non-empty, coherent commits; this plan produces 23 feature commits plus the already-created design commit.

---

## File Map

### Backend

- `backend/src/modules/model-accuracy/domain/modelCalibration.ts`: validated calibration records, query/response types, centralized threshold, and metric functions.
- `backend/src/modules/model-accuracy/domain/ports/ModelAccuracyRepository.ts`: persistence contract for imports, rows, model filters, and field monitoring inputs.
- `backend/src/modules/model-accuracy/application/ImportModelCalibration.ts`: import validation and normalized storage orchestration.
- `backend/src/modules/model-accuracy/application/GetModelCalibrationAnalytics.ts`: filtered analytics use case.
- `backend/src/modules/model-accuracy/infrastructure/SupabaseModelAccuracyRepository.ts`: Supabase reads/writes and row mapping.
- `backend/src/modules/model-accuracy/presentation/routes.ts`: protected analytics and import endpoints.
- `backend/src/middleware/auth.ts`: developer-or-admin request guard.
- `backend/supabase/migrations/20260915100000_add_model_calibration_results.sql`: immutable calibration import/sample tables and policies.

### Frontend

- `frontend/src/entities/model-accuracy/model/types.ts`: API calibration response types.
- `frontend/src/entities/model-accuracy/api/model-accuracy-client.ts`: analytics/import transport validation.
- `frontend/src/entities/model-accuracy/model/queries.ts`: filtered TanStack Query hook.
- `frontend/src/widgets/admin-dashboard/model/model-calibration.ts`: UI-facing selectors and field-monitoring derivations.
- `frontend/src/widgets/admin-dashboard/ui/model-calibration-section.tsx`: controlled calibration cards/charts/table.
- `frontend/src/widgets/admin-dashboard/ui/field-confidence-monitoring.tsx`: production dispute confidence monitoring.
- `frontend/src/widgets/admin-dashboard/ui/overview/inspection-chart.tsx`: append the new Overview section without changing dispute components.
- `frontend/src/widgets/history/model/use-history.ts`: consume navigation state for an inspection deep link.
- `frontend/src/pages/inspector/history-page.tsx`: preserve the existing detail sheet while accepting the selected inspection state.
- `frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts`: load analytics for authorized dashboard users and expose export data.

### Training producer

- `../meatlens-training-2/meatlens_pork_pipeline/calibration.py`: schema, record normalization, ECE/Brier-independent package serialization.
- `../meatlens-training-2/meatlens_pork_pipeline/evaluation.py`: include calibration records in evaluation output.
- `../meatlens-training-2/meatlens_pork_pipeline/cli.py`: expose model/dataset metadata for package generation.
- `../meatlens-training-2/05_regenerate_metrics_and_reports.ipynb`: emit the aggregate held-out calibration package.
- `../meatlens-training-2/06_train_final_deployment_model.ipynb`: emit the final deployment validation calibration package.
- `../meatlens-training-2/tests/unit/calibration/test_calibration.py`: deterministic producer contract tests.
- `../meatlens-training-2/tests/integration/training_pipeline/test_notebook_calibration.py`: notebook wiring tests.

### Reports and documentation

- `frontend/src/features/reports/model/types.ts`: optional controlled calibration report payload.
- `frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts`: CSV/JSON export fields.
- `documentation/model-calibration.md`: user-facing explanation and data limitations.
- `backend/src/features/developer-tools/model/api-docs-catalog.ts` or its existing equivalent: API catalog entry if the current catalog covers the new routes.

---

### Task 1: Establish calibration domain contracts with failing tests

**Files:**
- Create: `backend/src/modules/model-accuracy/domain/modelCalibration.ts`
- Modify: `backend/src/modules/model-accuracy/index.ts`
- Test: `backend/tests/unit/model-accuracy/model-calibration-domain.unit.test.ts`

**Interfaces:**
- Produces `CALIBRATION_BIN_COUNT = 10`, `HIGH_CONFIDENCE_THRESHOLD = 0.8`, `CalibrationPrediction`, `CalibrationAnalyticsQuery`, and `CalibrationAnalyticsResponse` types for all later backend tasks.

- [ ] **Step 1: Write failing contract tests** for valid/invalid probabilities, required labels, optional model metadata, and threshold centralization.
- [ ] **Step 2: Run** `npm run test:unit -w backend -- --test-name-pattern="calibration domain"`; expected failure because the domain module does not exist.
- [ ] **Step 3: Implement** the types, constants, and validators with finite values in `[0, 1]`, non-empty labels, complete probability keys, and no hard-coded class list.
- [ ] **Step 4: Run** the targeted test again; expected result is all calibration domain tests passing.
- [ ] **Step 5: Commit** `git add backend/src/modules/model-accuracy backend/tests/unit/model-accuracy/model-calibration-domain.unit.test.ts; git commit -m "feat: define calibration domain contracts"`.

### Task 2: Implement deterministic binning and metric math

**Files:**
- Modify: `backend/src/modules/model-accuracy/domain/modelCalibration.ts`
- Test: `backend/tests/unit/model-accuracy/model-calibration-metrics.unit.test.ts`

**Interfaces:**
- Produces `getConfidenceBin`, `calculateEce`, `calculateBrierScore`, `buildReliabilityBins`, `buildConfidenceDistribution`, and `buildClassCalibration`.

- [ ] **Step 1: Write failing tests** for ten bins, exact `0.8`, `0.9`, `1.0`, empty bins, all-view ECE, multiclass Brier, one-vs-rest class filtering, and sample counts.
- [ ] **Step 2: Run** `npm run test:unit -w backend -- --test-name-pattern="calibration metrics"`; expected failure on missing functions.
- [ ] **Step 3: Implement** half-open bins with a final inclusive bin, weighted ECE, multiclass one-hot Brier, and selected-class one-vs-rest calculations. Return `null` for unavailable statistics when there are no rows.
- [ ] **Step 4: Run** the targeted suite; expected result is passing math and boundary coverage.
- [ ] **Step 5: Commit** `git add backend/src/modules/model-accuracy/domain/modelCalibration.ts backend/tests/unit/model-accuracy/model-calibration-metrics.unit.test.ts; git commit -m "feat: add calibration metric calculations"`.

### Task 3: Add field-confidence aggregation as a separate pure domain

**Files:**
- Modify: `backend/src/modules/model-accuracy/domain/modelCalibration.ts`
- Test: `backend/tests/unit/model-accuracy/field-confidence-monitoring.unit.test.ts`

**Interfaces:**
- Produces `FieldConfidenceObservation`, `FieldConfidenceBucket`, `buildFieldConfidenceMonitoring`, and `selectHighConfidenceApprovedDisputes`.

- [ ] **Step 1: Write failing tests** for disputes/approved/rejected separation, complete denominators, null rates when denominator is unavailable, and approved high-confidence selection with original prediction/confidence preserved.
- [ ] **Step 2: Run** `npm run test:unit -w backend -- --test-name-pattern="field confidence"`; expected failure because aggregation functions are absent.
- [ ] **Step 3: Implement** ten percentage-range buckets over original inspection confidence and the centralized `0.8` threshold. Treat only explicit dispute statuses as events; never infer correctness from no dispute.
- [ ] **Step 4: Run** the targeted suite; expected result is passing aggregation tests.
- [ ] **Step 5: Commit** `git add backend/src/modules/model-accuracy/domain/modelCalibration.ts backend/tests/unit/model-accuracy/field-confidence-monitoring.unit.test.ts; git commit -m "feat: model field confidence observations"`.

### Task 4: Define repository ports for calibration persistence and monitoring inputs

**Files:**
- Modify: `backend/src/modules/model-accuracy/domain/ports/ModelAccuracyRepository.ts`
- Modify: `backend/src/modules/model-accuracy/index.ts`
- Test: `backend/tests/unit/model-accuracy/model-accuracy-repository-contract.unit.test.ts`

**Interfaces:**
- Adds `importCalibrationPackage(input): Promise<CalibrationImportRecord>` and `getCalibrationInputs(query): Promise<CalibrationRepositoryInputs>` to the existing repository port.

- [ ] **Step 1: Write failing type-level/behavioral tests** using a fake repository that records the exact import and analytics query shapes.
- [ ] **Step 2: Run** `npm run test:unit -w backend -- --test-name-pattern="repository contract"`; expected failure because the methods/types are not exported.
- [ ] **Step 3: Add** the port signatures and export all calibration repository types without changing existing snapshot methods.
- [ ] **Step 4: Run** the targeted test and existing model-accuracy tests; expected result is passing.
- [ ] **Step 5: Commit** `git add backend/src/modules/model-accuracy/domain/ports backend/src/modules/model-accuracy/index.ts backend/tests/unit/model-accuracy/model-accuracy-repository-contract.unit.test.ts; git commit -m "feat: extend model accuracy repository for calibration"`.

### Task 5: Add the Supabase calibration migration

**Files:**
- Create: `backend/supabase/migrations/20260915100000_add_model_calibration_results.sql`
- Test: `backend/tests/unit/infrastructure/model-calibration-migration.unit.test.ts`

**Interfaces:**
- Creates immutable `model_calibration_imports` metadata and `model_calibration_samples` normalized rows, with optional `model_version_id`, optional external `model_version_key`, source hash uniqueness, row uniqueness per import/sample, indexes, service-role grants, and RLS enabled.

- [ ] **Step 1: Write failing migration-contract tests** asserting table names, required columns, checks, indexes, RLS, grants, and duplicate constraints.
- [ ] **Step 2: Run** `npm run test:infrastructure -w backend -- --test-name-pattern="calibration migration"`; expected failure because the migration is absent.
- [ ] **Step 3: Write** the forward-only SQL. Store `probabilities` as JSONB and labels as text so application/model class definitions remain authoritative.
- [ ] **Step 4: Run** the migration-contract test plus the existing migration syntax checks; expected result is passing.
- [ ] **Step 5: Commit** `git add backend/supabase/migrations/20260915100000_add_model_calibration_results.sql backend/tests/unit/infrastructure/model-calibration-migration.unit.test.ts; git commit -m "feat: persist controlled calibration results"`.

### Task 6: Build import package validation as a test-first application use case

**Files:**
- Create: `backend/src/modules/model-accuracy/application/ImportModelCalibration.ts`
- Modify: `backend/src/modules/model-accuracy/domain/modelCalibration.ts`
- Test: `backend/tests/unit/model-accuracy/import-model-calibration.unit.test.ts`

**Interfaces:**
- Produces `ImportModelCalibration.execute(input: { packagePath: string; importedBy: string }): Promise<CalibrationImportRecord>`.

- [ ] **Step 1: Write failing tests** for missing manifest, unsupported schema, missing required fields, invalid probabilities, duplicate sample IDs, row-count mismatch, unsafe ZIP paths, and valid package normalization.
- [ ] **Step 2: Run** `npm run test:unit -w backend -- --test-name-pattern="import model calibration"`; expected failure because the use case is absent.
- [ ] **Step 3: Implement** bounded ZIP extraction using existing `fflate` conventions, JSONL parsing, manifest/row validation, and a single repository call. Do not load images or persist arbitrary artifacts.
- [ ] **Step 4: Run** the targeted suite and existing dashboard import-validation tests; expected result is passing.
- [ ] **Step 5: Commit** `git add backend/src/modules/model-accuracy/application/ImportModelCalibration.ts backend/src/modules/model-accuracy/domain/modelCalibration.ts backend/tests/unit/model-accuracy/import-model-calibration.unit.test.ts; git commit -m "feat: validate calibration package imports"`.

### Task 7: Implement Supabase repository writes and reads

**Files:**
- Modify: `backend/src/modules/model-accuracy/infrastructure/SupabaseModelAccuracyRepository.ts`
- Modify: `backend/src/modules/model-accuracy/infrastructure/SupabaseModelAccuracyFactory.ts`
- Test: `backend/tests/unit/model-accuracy/supabase-model-calibration-repository.unit.test.ts`

**Interfaces:**
- Implements the port methods while preserving the existing snapshot mapping and fake Supabase query conventions.

- [ ] **Step 1: Write failing repository tests** for import metadata/sample inserts, source-hash duplicate mapping, optional model-version lookup, filtered row reads, inspection confidence/dispute reads, and model-version sorting.
- [ ] **Step 2: Run** `npm run test:unit -w backend -- --test-name-pattern="Supabase model calibration repository"`; expected failure on missing methods.
- [ ] **Step 3: Implement** typed row mapping, batch inserts, exact model/class filters, bounded reads, and persistence errors that remain safe for API responses.
- [ ] **Step 4: Run** targeted repository tests plus all existing model-accuracy repository tests; expected result is passing.
- [ ] **Step 5: Commit** `git add backend/src/modules/model-accuracy/infrastructure backend/tests/unit/model-accuracy/supabase-model-calibration-repository.unit.test.ts; git commit -m "feat: store and query calibration records"`.

### Task 8: Add the filtered analytics application service

**Files:**
- Create: `backend/src/modules/model-accuracy/application/GetModelCalibrationAnalytics.ts`
- Modify: `backend/src/modules/model-accuracy/index.ts`
- Test: `backend/tests/unit/model-accuracy/get-model-calibration-analytics.unit.test.ts`

**Interfaces:**
- Produces `GetModelCalibrationAnalytics.execute(query: CalibrationAnalyticsQuery): Promise<CalibrationAnalyticsResponse>`.

- [ ] **Step 1: Write failing tests** for all/class/model filtering, empty controlled data, all metric denominators, reliability/confidence distribution output, field monitoring inclusion, and high-confidence cases.
- [ ] **Step 2: Run** `npm run test:unit -w backend -- --test-name-pattern="get model calibration analytics"`; expected failure because the service is absent.
- [ ] **Step 3: Implement** repository input retrieval followed by pure domain calculations. Keep controlled rows and field observations separate in the response.
- [ ] **Step 4: Run** the targeted service suite; expected result is passing.
- [ ] **Step 5: Commit** `git add backend/src/modules/model-accuracy/application/GetModelCalibrationAnalytics.ts backend/src/modules/model-accuracy/index.ts backend/tests/unit/model-accuracy/get-model-calibration-analytics.unit.test.ts; git commit -m "feat: assemble calibration analytics response"`.

### Task 9: Add developer/admin authorization and API validation tests

**Files:**
- Modify: `backend/src/middleware/auth.ts`
- Modify: `backend/src/modules/model-accuracy/presentation/routes.ts`
- Test: `backend/tests/unit/auth/developer-or-admin-auth.unit.test.ts`
- Test: `backend/tests/unit/model-accuracy/model-calibration-router.unit.test.ts`

**Interfaces:**
- Produces `requireDeveloperOrAdmin` and routes `GET /api/model-accuracy/calibration` and `POST /api/model-accuracy/calibration/import`.

- [ ] **Step 1: Write failing tests** proving plain users are denied, admins and developers are allowed, query strings are normalized, invalid class/model filters return 400, and import requires a package file.
- [ ] **Step 2: Run** `npm run test:unit -w backend -- --test-name-pattern="developer or admin|model calibration router"`; expected failure because guard/routes are absent.
- [ ] **Step 3: Implement** the guard using the existing `RequestAuthContext` booleans and add route handlers with existing transport-file materialization and timeout limits.
- [ ] **Step 4: Run** targeted route/auth tests and the dashboard auth integration suite; expected result is passing.
- [ ] **Step 5: Commit** `git add backend/src/middleware/auth.ts backend/src/modules/model-accuracy/presentation/routes.ts backend/tests/unit/auth/developer-or-admin-auth.unit.test.ts backend/tests/unit/model-accuracy/model-calibration-router.unit.test.ts; git commit -m "feat: expose protected calibration analytics routes"`.

### Task 10: Add audit logging and route registration

**Files:**
- Modify: `backend/src/modules/model-accuracy/presentation/routes.ts`
- Modify: `backend/src/modules/model-accuracy/index.ts`
- Modify: `backend/src/bootstrap/routes.ts`
- Test: `backend/tests/unit/model-accuracy/model-calibration-audit.unit.test.ts`

**Interfaces:**
- Calibration imports emit `model.calibration.imported` with actor/source/import ID/model key/sample count; GET requests emit no aggregate-read audit event.

- [ ] **Step 1: Write failing tests** for the audit payload and route mounting at `/api/model-accuracy`.
- [ ] **Step 2: Run** `npm run test:unit -w backend -- --test-name-pattern="calibration audit|route registration"`; expected failure on missing event wiring.
- [ ] **Step 3: Implement** the existing `auditLogService.write` call after a successful import and preserve error handling/actor conventions.
- [ ] **Step 4: Run** targeted tests plus backend route architecture tests; expected result is passing.
- [ ] **Step 5: Commit** `git add backend/src/modules/model-accuracy backend/src/bootstrap/routes.ts backend/tests/unit/model-accuracy/model-calibration-audit.unit.test.ts; git commit -m "feat: audit calibration imports"`.

### Task 11: Add training-producer calibration package tests first

**Files:**
- Create: `../meatlens-training-2/meatlens_pork_pipeline/calibration.py`
- Test: `../meatlens-training-2/tests/unit/calibration/test_calibration.py`

**Interfaces:**
- Produces Python `CalibrationManifest`, `build_calibration_records(prediction_df, labels)`, and `write_calibration_package(records, manifest, output_path)`.

- [ ] **Step 1: Write failing pytest tests** for canonical JSONL keys, probability normalization, row count, class labels, ZIP members, UTF-8 JSONL, and deterministic output from a fixed DataFrame.
- [ ] **Step 2: Run** `pytest tests/unit/calibration/test_calibration.py -q`; expected failure because the module is absent.
- [ ] **Step 3: Implement** package serialization without metric calculation duplication: preserve actual pipeline label order and require `true_label`, `predicted_label`, `confidence`, and per-class probabilities.
- [ ] **Step 4: Run** the targeted pytest file; expected result is passing.
- [ ] **Step 5: Commit in the training repository** `git add meatlens_pork_pipeline/calibration.py tests/unit/calibration/test_calibration.py; git commit -m "feat: define calibration package producer"`.

### Task 12: Extend Python evaluation output with calibration records

**Files:**
- Modify: `../meatlens-training-2/meatlens_pork_pipeline/evaluation.py`
- Modify: `../meatlens-training-2/meatlens_pork_pipeline/cli.py`
- Test: `../meatlens-training-2/tests/unit/evaluation/test_evaluation.py`

**Interfaces:**
- `EvaluationSummary` gains a calibration package path; `evaluate_model` accepts model/dataset metadata and writes `calibration-package.zip` beside existing metrics/predictions.

- [ ] **Step 1: Write failing tests** asserting evaluation summary exposes the package and CLI passes metadata without changing existing CSV/metric outputs.
- [ ] **Step 2: Run** `pytest tests/unit/evaluation/test_evaluation.py -q`; expected failure on missing summary field/output.
- [ ] **Step 3: Implement** the package call from the already-generated probability vectors and add optional CLI metadata flags with stable defaults.
- [ ] **Step 4: Run** the targeted evaluation tests and existing CLI tests; expected result is passing.
- [ ] **Step 5: Commit in the training repository** `git add meatlens_pork_pipeline/evaluation.py meatlens_pork_pipeline/cli.py tests/unit/evaluation/test_evaluation.py; git commit -m "feat: emit calibration package from evaluation"`.

### Task 13: Wire aggregate held-out calibration output into notebook 05

**Files:**
- Modify: `../meatlens-training-2/05_regenerate_metrics_and_reports.ipynb`
- Create: `../meatlens-training-2/tests/integration/training_pipeline/test_notebook_calibration.py`

**Interfaces:**
- Notebook 05 writes `calibration-package.zip` from the combined held-out prediction frame and includes model/dataset/split provenance in its manifest.

- [ ] **Step 1: Write failing notebook-source and execution tests** asserting the output package exists, has `manifest.json` and `predictions.jsonl`, and has the expected deterministic count.
- [ ] **Step 2: Run** `pytest tests/integration/training_pipeline/test_notebook_calibration.py -q`; expected failure because notebook 05 does not write the package.
- [ ] **Step 3: Add** a notebook cell that calls `write_calibration_package` after loading predictions and before report artifacts, using `LABEL_ORDER` and explicit held-out split metadata.
- [ ] **Step 4: Run** the targeted notebook tests; expected result is passing without rerunning a full training campaign.
- [ ] **Step 5: Commit in the training repository** `git add 05_regenerate_metrics_and_reports.ipynb tests/integration/training_pipeline/test_notebook_calibration.py; git commit -m "feat: export cross-validation calibration package"`.

### Task 14: Wire final deployment validation calibration output into notebook 06

**Files:**
- Modify: `../meatlens-training-2/06_train_final_deployment_model.ipynb`
- Modify: `../meatlens-training-2/docs/training-pipeline-usage.md`
- Test: `../meatlens-training-2/tests/integration/training_pipeline/test_notebook_final_deployment.py`

**Interfaces:**
- Notebook 06 writes `final_validation_calibration-package.zip` next to `final_validation_predictions.csv` and documents it as a held-out validation artifact.

- [ ] **Step 1: Write failing tests** for the final notebook source/output contract and usage documentation.
- [ ] **Step 2: Run** `pytest tests/integration/training_pipeline/test_notebook_final_deployment.py -q`; expected failure on missing calibration artifact.
- [ ] **Step 3: Add** package generation from the final validation prediction CSV with the actual `LABEL_ORDER`, deployment model identity, and validation split metadata.
- [ ] **Step 4: Run** the targeted integration tests; expected result is passing.
- [ ] **Step 5: Commit in the training repository** `git add 06_train_final_deployment_model.ipynb docs/training-pipeline-usage.md tests/integration/training_pipeline/test_notebook_final_deployment.py; git commit -m "feat: export final validation calibration package"`.

### Task 15: Add frontend calibration types and response validation

**Files:**
- Modify: `frontend/src/entities/model-accuracy/model/types.ts`
- Modify: `frontend/src/entities/model-accuracy/api/model-accuracy-client.ts`
- Test: `frontend/tests/unit/entities/model-accuracy-calibration-client.unit.test.ts`

**Interfaces:**
- Produces `ModelCalibrationAnalytics`, `CalibrationReliabilityBin`, `ConfidenceDistributionBin`, `FieldConfidenceBucket`, and `HighConfidenceApprovedDispute` frontend types plus `getCalibrationAnalytics` and `importCalibrationPackage` client methods.

- [ ] **Step 1: Write failing tests** for URL query encoding, developer/admin response fields, sample count validation, null rates, class/model filters, auth expiry behavior, and malformed response rejection.
- [ ] **Step 2: Run** `npm run test:unit -w frontend -- --test-name-pattern="model calibration client"`; expected failure because methods/types are absent.
- [ ] **Step 3: Implement** runtime response guards consistent with the existing model-accuracy client and multipart import transport.
- [ ] **Step 4: Run** targeted frontend tests and existing model-accuracy client tests; expected result is passing.
- [ ] **Step 5: Commit** `git add frontend/src/entities/model-accuracy frontend/tests/unit/entities/model-accuracy-calibration-client.unit.test.ts; git commit -m "feat: add frontend calibration client"`.

### Task 16: Add filtered query state and dashboard model selectors

**Files:**
- Modify: `frontend/src/entities/model-accuracy/model/queries.ts`
- Create: `frontend/src/widgets/admin-dashboard/model/model-calibration.ts`
- Modify: `frontend/src/entities/model-accuracy/index.ts`
- Test: `frontend/tests/unit/widgets/admin-dashboard/model-calibration.unit.test.ts`

**Interfaces:**
- Produces `useModelCalibrationAnalytics({ modelVersionKey, className })`, query keys containing both filters, and frontend formatting/selectors for `All` plus API-provided class/model options.

- [ ] **Step 1: Write failing tests** for query-key filter identity, empty response selectors, class options derived from data, model options derived from data, and threshold copy.
- [ ] **Step 2: Run** `npm run test:unit -w frontend -- --test-name-pattern="model calibration model"`; expected failure on missing hook/selectors.
- [ ] **Step 3: Implement** the hook using authenticated dashboard state and selectors that never invent class/model names.
- [ ] **Step 4: Run** targeted tests; expected result is passing.
- [ ] **Step 5: Commit** `git add frontend/src/entities/model-accuracy frontend/src/widgets/admin-dashboard/model/model-calibration.ts frontend/tests/unit/widgets/admin-dashboard/model-calibration.unit.test.ts; git commit -m "feat: add calibration query state"`.

### Task 17: Build controlled calibration cards and reliability visualizations

**Files:**
- Create: `frontend/src/widgets/admin-dashboard/ui/model-calibration-section.tsx`
- Test: `frontend/tests/component/admin-dashboard/model-calibration-section.component.test.tsx`

**Interfaces:**
- Renders `ModelCalibrationSection` with loading, error, no-controlled-data, populated, and low-sample states. Uses existing `ChartContainer`, `LineChart`, `BarChart`, Card, Select, and Table primitives.

- [ ] **Step 1: Write failing component tests** for ECE/Brier/sample cards, ideal diagonal, reliability points with counts, confidence distribution labels, per-class values, filters, accessible labels, and empty/loading/error copy.
- [ ] **Step 2: Run** `npm run test:component -w frontend -- --test-name-pattern="ModelCalibrationSection"`; expected failure because the component is absent.
- [ ] **Step 3: Implement** the responsive visual surface with confidence percentages, null-safe values, accessible chart descriptions, and no duplicate Overview dispute statistics.
- [ ] **Step 4: Run** targeted component tests and frontend typecheck; expected result is passing.
- [ ] **Step 5: Commit** `git add frontend/src/widgets/admin-dashboard/ui/model-calibration-section.tsx frontend/tests/component/admin-dashboard/model-calibration-section.component.test.tsx; git commit -m "feat: render controlled calibration analytics"`.

### Task 18: Build field monitoring and investigation table

**Files:**
- Create: `frontend/src/widgets/admin-dashboard/ui/field-confidence-monitoring.tsx`
- Test: `frontend/tests/component/admin-dashboard/field-confidence-monitoring.component.test.tsx`

**Interfaces:**
- Renders `FieldConfidenceMonitoring` with observational labels, dispute/approved/rejected series, denominator-aware rates, original AI fields, and navigation callback `(inspectionId: string) => void`.

- [ ] **Step 1: Write failing tests** for separate status series, no-rate display when denominator is null, warning copy that disputes are not accuracy, empty state, and high-confidence row selection.
- [ ] **Step 2: Run** `npm run test:component -w frontend -- --test-name-pattern="FieldConfidenceMonitoring"`; expected failure because the component is absent.
- [ ] **Step 3: Implement** charts/table from the API response and link each investigation row to the existing navigation callback; do not mutate or replace original prediction values.
- [ ] **Step 4: Run** targeted component tests and frontend lint; expected result is passing.
- [ ] **Step 5: Commit** `git add frontend/src/widgets/admin-dashboard/ui/field-confidence-monitoring.tsx frontend/tests/component/admin-dashboard/field-confidence-monitoring.component.test.tsx; git commit -m "feat: render field confidence monitoring"`.

### Task 19: Integrate calibration into the existing Overview tab

**Files:**
- Modify: `frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts`
- Modify: `frontend/src/widgets/admin-dashboard/ui/overview/inspection-chart.tsx`
- Modify: `frontend/src/widgets/admin-dashboard/ui/desktop-overview-tab.tsx`
- Modify: `frontend/src/widgets/admin-dashboard/ui/mobile-overview-tab.tsx`
- Test: `frontend/tests/unit/widgets/admin-dashboard/overview-calibration-integration.unit.test.tsx`

**Interfaces:**
- The existing Overview receives a developer/admin-only `ModelCalibrationSection` after the business analytics and existing dispute section. Existing `DisputeOverview` structure and metrics remain unchanged.

- [ ] **Step 1: Write failing integration tests** proving admin/developer visibility, overview placement, existing dispute section preservation, reload/error handling, and mobile/desktop rendering.
- [ ] **Step 2: Run** `npm run test:unit -w frontend -- --test-name-pattern="overview calibration"`; expected failure because the dashboard does not load/render calibration.
- [ ] **Step 3: Add** query loading to the dashboard view model and render the section with its own loading/error state; keep plain inspectors out of the analytics request path.
- [ ] **Step 4: Run** targeted integration tests and dashboard composition tests; expected result is passing.
- [ ] **Step 5: Commit** `git add frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts frontend/src/widgets/admin-dashboard/ui/overview/inspection-chart.tsx frontend/src/widgets/admin-dashboard/ui/desktop-overview-tab.tsx frontend/src/widgets/admin-dashboard/ui/mobile-overview-tab.tsx frontend/tests/unit/widgets/admin-dashboard/overview-calibration-integration.unit.test.tsx; git commit -m "feat: integrate calibration into overview"`.

### Task 20: Link investigation rows to the existing inspection detail sheet

**Files:**
- Modify: `frontend/src/widgets/admin-dashboard/ui/field-confidence-monitoring.tsx`
- Modify: `frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts`
- Modify: `frontend/src/widgets/history/model/use-history.ts`
- Modify: `frontend/src/pages/inspector/history-page.tsx`
- Test: `frontend/tests/unit/widgets/history/history-inspection-navigation.unit.test.tsx`

**Interfaces:**
- Navigation uses `navigate(ROUTE_PATHS.history, { state: { inspectionId } })`; `useHistory` selects the matching loaded inspection and the existing `InspectionDetailSheet` opens it.

- [ ] **Step 1: Write failing tests** for state-driven selection, missing inspection fallback, sheet close behavior, and high-confidence row navigation.
- [ ] **Step 2: Run** `npm run test:unit -w frontend -- --test-name-pattern="history inspection navigation"`; expected failure because History ignores route state.
- [ ] **Step 3: Implement** a one-shot `useLocation` effect that selects the matching inspection without introducing a new detail page or changing existing list behavior.
- [ ] **Step 4: Run** targeted tests and existing history page tests; expected result is passing.
- [ ] **Step 5: Commit** `git add frontend/src/widgets/admin-dashboard/ui/field-confidence-monitoring.tsx frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts frontend/src/widgets/history/model/use-history.ts frontend/src/pages/inspector/history-page.tsx frontend/tests/unit/widgets/history/history-inspection-navigation.unit.test.tsx; git commit -m "feat: link calibration investigations to inspection detail"`.

### Task 21: Make calibration data reusable by report exports

**Files:**
- Modify: `frontend/src/features/reports/model/types.ts`
- Modify: `frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts`
- Modify: `frontend/src/widgets/admin-dashboard/lib/dashboard.ts`
- Test: `frontend/tests/unit/widgets/admin-dashboard/calibration-report-export.unit.test.ts`

**Interfaces:**
- CSV and JSON exports include the already-computed controlled calibration summary, reliability bins, and field-monitoring observations. They do not recalculate ECE/Brier or relabel field monitoring as accuracy.

- [ ] **Step 1: Write failing tests** for sample count presence, metric values copied from the API response, field-monitoring terminology, and empty calibration export behavior.
- [ ] **Step 2: Run** `npm run test:unit -w frontend -- --test-name-pattern="calibration report export"`; expected failure because report exports omit the new response.
- [ ] **Step 3: Implement** optional report model fields and append export sections using existing `toCsvValue`/JSON conventions.
- [ ] **Step 4: Run** targeted tests plus existing report-formatting and admin-report tests; expected result is passing.
- [ ] **Step 5: Commit** `git add frontend/src/features/reports/model/types.ts frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts frontend/src/widgets/admin-dashboard/lib/dashboard.ts frontend/tests/unit/widgets/admin-dashboard/calibration-report-export.unit.test.ts; git commit -m "feat: include calibration in report exports"`.

### Task 22: Document calibration semantics and API metadata

**Files:**
- Create: `documentation/model-calibration.md`
- Modify: `frontend/src/features/developer-tools/model/api-docs-catalog.ts`
- Test: `scripts/check-documentation.test.mjs` or the existing documentation test file

**Interfaces:**
- Documentation explains calibration versus accuracy, ECE, Brier score, reliability diagrams, ten-bin boundaries, controlled versus field monitoring, dispute limitations, source data, threshold configuration, and package import shape.

- [ ] **Step 1: Write failing documentation tests** for the required headings/terms and API catalog entries.
- [ ] **Step 2: Run** `npm run test:documentation`; expected failure on missing documentation/catalog text.
- [ ] **Step 3: Add** the technical/user documentation and catalog entries without claiming production disputes are ground truth.
- [ ] **Step 4: Run** documentation tests and markdown/content checks; expected result is passing.
- [ ] **Step 5: Commit** `git add documentation/model-calibration.md frontend/src/features/developer-tools/model/api-docs-catalog.ts scripts/check-documentation.test.mjs; git commit -m "docs: explain model calibration analytics"`.

### Task 23: Run complete verification and preserve unrelated worktree changes

**Files:**
- Modify only feature files if a verification failure reveals a feature defect.
- Do not stage `.gitignore`, manual artifacts, reports, or unrelated existing modifications.

**Interfaces:**
- Final branch contains the approved design plus at least 20 coherent feature commits, with no claims based on stale or partial verification.

- [ ] **Step 1: Run targeted backend checks:** `npm run test:unit -w backend -- --test-name-pattern="calibration|developer or admin"`, `npm run typecheck -w backend`, and `npm run test:infrastructure -w backend`.
- [ ] **Step 2: Run targeted frontend checks:** `npm run test:unit -w frontend -- --test-name-pattern="calibration|history inspection navigation"`, `npm run test:component -w frontend -- --test-name-pattern="Calibration|FieldConfidenceMonitoring"`, `npm run typecheck -w frontend`, and `npm run lint -w frontend`.
- [ ] **Step 3: Run training checks from `../meatlens-training-2`:** `pytest tests/unit/calibration tests/unit/evaluation tests/integration/training_pipeline/test_notebook_calibration.py -q`.
- [ ] **Step 4: Run complete repository gates:** `npm run lint`, `npm run typecheck`, `npm run test:ci`, and the training repository's documented pytest gate. Run critical E2E if the environment supports its services; report unavailable remote CI explicitly.
- [ ] **Step 5: Inspect** `git diff --check`, `git status --short`, and `git log --oneline -25`; verify only feature commits/files are staged and report exact command results.

## Self-review checklist

- Calibration data source is held-out labeled prediction output from `meatlens-training-2`, not production inspections.
- ECE, Brier, ten bins, sample counts, empty bins, and boundaries are covered by deterministic backend tests.
- Class filtering uses producer-provided labels and one-vs-rest semantics; model filtering uses provided provenance only.
- Reliability diagram and confidence distribution use existing chart infrastructure and show counts/empty states.
- Field monitoring is separate, status-specific, denominator-aware, and not called accuracy.
- High-confidence approved disputes use the centralized threshold and preserve original inspection values.
- Existing Overview dispute section is retained.
- Admin/developer authorization, API validation, audit logging, RLS, and report reuse are assigned tasks.
- Training later stages produce the import package and have tests.
- No unresolved placeholders, fake model versions, raw dataset persistence, or disabled gates are introduced.
