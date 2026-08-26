# Determinate Export Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real determinate progress bars to every export loading overlay, including backend image progress for large developer dataset ZIP exports.

**Architecture:** Extend the existing export task state with an optional `{ current, total }` progress value. Browser-owned exports report their actual serialization/image-loading phases directly. Developer dataset exports use a bounded in-process backend session with authenticated progress and download endpoints; no external queue, worker, Redis, polling service, or storage system is introduced.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Express, Supabase, `pdfmake`, `fflate`, and existing `tsx --test` suites.

## Global Constraints

- Keep all original inspection images in developer dataset exports.
- Do not add lazy loading.
- Add zero external infrastructure; progress sessions are in-memory and bounded to the existing backend process.
- Preserve existing export formats, filters, authentication, and error handling.
- Keep a spinner when a task has no measurable total and show a percentage bar when progress is available.
- Keep the unrelated `frontend/tests/unit/utilities/shared-date-storage.unit.test.ts` modification untouched.

---

### Task 1: Define the shared progress contract

**Files:**
- Modify: `frontend/src/shared/lib/use-export-task.ts`
- Test: `frontend/tests/unit/state/export-task.unit.test.tsx`

**Interfaces:**
- Add `ExportProgress = { current: number; total: number }`.
- `useExportTask<Task>()` returns `{ activeTask, progress, run }`.
- `run(task, operation)` exposes `report(progress)` to the operation and resets progress in `finally`.

- [ ] Add a failing test that reports `2/10`, observes it while the operation is pending, and verifies task/progress reset after completion.
- [ ] Run `npx tsx --test tests/unit/state/export-task.unit.test.tsx` from `frontend`; expect failure because `progress` and the reporter do not exist.
- [ ] Implement the progress state/ref and clamp reported values to `0 <= current <= total` with positive totals.
- [ ] Re-run the focused test and the existing duplicate-click assertion; expect both to pass.
- [ ] Commit `feat: add shared export progress state`.

### Task 2: Render a determinate progress bar in the shared overlay

**Files:**
- Modify: `frontend/src/shared/ui/export-loading-overlay.tsx`
- Test: `frontend/tests/unit/widgets/export-loading-overlay.unit.test.tsx`

**Interfaces:**
- `ExportLoadingOverlayProps` accepts optional `progress?: ExportProgress | null`.
- Determinate state renders an accessible `progressbar` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and percentage text.
- Missing progress preserves the current spinner-only UI.

- [ ] Add failing render assertions for a `4/10` progress bar and percentage text while retaining the existing indeterminate assertion.
- [ ] Run the focused overlay test; expect failure because no progressbar is rendered.
- [ ] Render a native progress element with a clamped percentage and keep `Loader2` for the indeterminate branch.
- [ ] Re-run the focused overlay test; expect it to pass.
- [ ] Commit `feat: render determinate export progress`.

### Task 3: Report real progress from admin report exports

**Files:**
- Modify: `frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts`
- Modify: `frontend/src/widgets/admin-dashboard/ui/reports-tab.tsx`
- Modify: `frontend/src/widgets/admin-dashboard/ui/mobile-reports-tab.tsx`
- Test: `frontend/tests/unit/state/admin-report-loading-ui.unit.test.tsx`

**Interfaces:**
- `activeReportExportProgress: ExportProgress | null` is returned with `activeReportExport`.
- CSV/JSON report exports report phase `1/2` before serialization and `2/2` before download.
- PDF report exports report `1/3` while building, `2/3` while generating, and `3/3` before download.

- [ ] Add failing desktop/mobile assertions that pass `activeReportExportProgress` and render the percentage bar.
- [ ] Run the focused admin report UI tests; expect failure because progress is not returned/rendered.
- [ ] Thread `reportExport.progress` through the model and both report views, using the existing format-specific messages.
- [ ] Re-run the focused admin report UI tests and typecheck; expect success.
- [ ] Commit `feat: show admin report export progress`.

### Task 4: Report real progress from History PDF exports

**Files:**
- Modify: `frontend/src/widgets/history/model/use-history.ts`
- Modify: `frontend/src/pages/inspector/history-page.tsx`
- Modify: `frontend/src/widgets/history/ui/inspection-timeline-section.tsx`
- Test: `frontend/tests/unit/state/history-export-loading-ui.unit.test.tsx`

**Interfaces:**
- History exposes `exportProgress: ExportProgress | null` alongside `isExportingDetailedPdf`.
- The timeline overlay receives and renders that progress.

- [ ] Add a failing `2/3` render assertion for History PDF export.
- [ ] Run the focused History test; expect failure because the progress prop is absent.
- [ ] Report the three existing PDF phases and pass progress to the overlay.
- [ ] Re-run the focused History test and frontend typecheck; expect success.
- [ ] Commit `feat: show history PDF export progress`.

### Task 5: Report real progress from Offline Queue exports

**Files:**
- Modify: `frontend/src/features/developer-tools/ui/developer-options-panel.tsx`
- Test: `frontend/tests/unit/state/developer-options-export-state.unit.test.tsx`

**Interfaces:**
- Offline Queue export reports each mapped scan as `current/total`.
- The Debug Utilities overlay receives the queue progress and shows the percentage.

- [ ] Add a failing test for a pending queue with three scans that observes `1/3` progress.
- [ ] Run the focused developer-options test; expect failure because queue progress is not exposed.
- [ ] Call the shared reporter after each payload row is mapped and pass progress to the overlay.
- [ ] Re-run the focused test and typecheck; expect success.
- [ ] Commit `feat: show offline queue export progress`.

### Task 6: Add authenticated in-process dataset export sessions

**Files:**
- Modify: `backend/src/modules/developer/infrastructure/DeveloperDashboardService.ts`
- Modify: `backend/src/modules/developer/presentation/controllers/DeveloperDashboardController.ts`
- Modify: `backend/src/modules/developer/presentation/dashboard-routes.ts`
- Test: `backend/tests/unit/developer/dataset-export-progress.unit.test.ts`

**Interfaces:**
- `startDatasetExportSession(filters, ownerId): Promise<{ exportId: string }>` starts the existing export asynchronously.
- `getDatasetExportProgress(exportId, ownerId): DatasetExportProgress` returns `{ status: "running" | "completed" | "failed"; stage: string; current: number; total: number; error?: string }`.
- `getDatasetExportBuffer(exportId, ownerId): { filename: string; buffer: Buffer }` returns only completed exports.
- Sessions are bounded in memory, owner-scoped, and removed after download or a short TTL.

- [ ] Add a failing service test for start → progress update → completed buffer and owner mismatch rejection.
- [ ] Run the focused backend progress test; expect failure because session methods do not exist.
- [ ] Implement a bounded `Map` session registry around the existing synchronous ZIP service and callback progress updates, with no new process or data service.
- [ ] Add `POST /datasets/export/start`, `GET /datasets/export/:exportId/progress`, and `GET /datasets/export/:exportId/download` controller handlers using the existing developer auth middleware.
- [ ] Re-run the focused test and backend typecheck; expect success.
- [ ] Commit `feat: add in-process dataset export progress sessions`.

### Task 7: Report exact dataset image progress from the backend

**Files:**
- Modify: `backend/src/modules/developer/infrastructure/DeveloperDashboardService.ts`
- Modify: `backend/tests/unit/developer/dataset-export.unit.test.ts`
- Modify: `backend/tests/unit/developer/dataset-export-progress.unit.test.ts`

**Interfaces:**
- The export callback reports `querying`, `downloading-images`, `assembling-zip`, and `complete` stages.
- Image progress increments once per row, preserves concurrency/order, and still rejects required-image failures.

- [ ] Add failing assertions for exact image `current` increments and final ZIP integrity.
- [ ] Run focused backend dataset export tests; expect failure because callbacks are not emitted.
- [ ] Emit callback events at query completion, for every image result, before ZIP assembly, and after assembly.
- [ ] Re-run all focused backend dataset export/progress tests; expect success.
- [ ] Commit `feat: report dataset image export progress`.

### Task 8: Use session endpoints in the dataset client

**Files:**
- Modify: `frontend/src/entities/developer-metrics/api/developer-dashboard-client.ts`
- Test: `frontend/tests/unit/utilities/developer-dashboard-export-timeout.unit.test.ts`

**Interfaces:**
- `exportDatasets(filters, onProgress?)` starts a session, reads progress until completion, downloads the ZIP, and forwards `ExportProgress` plus stage text.
- Existing timeout handling remains bounded for start/progress/download requests.

- [ ] Add a failing client test with mocked start/progress/download responses that asserts progress callbacks receive `1/3` and `3/3` and the final result is a Blob.
- [ ] Run the focused client test; expect failure because the client still performs one direct POST.
- [ ] Implement bounded polling with a timer, stop on completed/failed status, and preserve API error messages.
- [ ] Re-run the focused client test and timeout test; expect success.
- [ ] Commit `feat: stream dataset export progress to client`.

### Task 9: Wire dataset progress into the developer dashboard UI

**Files:**
- Modify: `frontend/src/features/developer-tools/model/use-developer-dashboard.ts`
- Modify: `frontend/src/features/developer-tools/ui/datasets-section.tsx`
- Modify: `frontend/src/widgets/admin-dashboard/ui/developer-tab-content.tsx`
- Test: `frontend/tests/unit/state/developer-dashboard-workspace.unit.test.tsx`

**Interfaces:**
- Dataset export state includes `exportProgress: ExportProgress | null` and `exportStage: string | null`.
- The overlay displays the backend stage and exact percentage while exporting.

- [ ] Add failing UI assertions for `Downloading images` and a nonzero progressbar value.
- [ ] Run the focused dashboard test; expect failure because the hook exposes only a boolean.
- [ ] Forward client progress into hook state, then render stage text and progress through `DeveloperDatasetsSection`.
- [ ] Re-run focused dashboard tests and frontend typecheck; expect success.
- [ ] Commit `feat: show dataset image export progress`.

### Task 10: Preserve the direct export compatibility contract

**Files:**
- Modify: `backend/src/modules/developer/presentation/controllers/DeveloperDashboardController.ts`
- Modify: `frontend/src/entities/developer-metrics/api/developer-dashboard-client.ts`
- Modify: `documentation/API_REFERENCE.md`
- Test: `backend/tests/unit/developer/dataset-export-progress.unit.test.ts`

**Interfaces:**
- The old direct service method remains available for internal callers/tests.
- New session routes are documented as in-process, owner-scoped, and non-durable across process restarts.

- [ ] Add a failing documentation/route assertion for the three session endpoints and direct service compatibility.
- [ ] Run the focused contract test; expect failure because the API reference and route markers are missing.
- [ ] Document the progress session lifecycle and retain the existing successful ZIP format.
- [ ] Re-run the focused contract test and backend typecheck; expect success.
- [ ] Commit `docs: document dataset export progress sessions`.

### Task 11: Full verification and merge

**Files:**
- Modify: only files required by verification findings.

- [ ] Run focused frontend progress tests and backend export progress tests.
- [ ] Run `npm run typecheck` and `npm run build:all` from the repository root.
- [ ] Run the full frontend and backend unit suites.
- [ ] Run `git diff --check` and confirm the unrelated main-checkout test change is untouched.
- [ ] Commit any verification-only corrections separately.
- [ ] Fast-forward `master` from `feat/export-loading-performance` after all checks pass.
