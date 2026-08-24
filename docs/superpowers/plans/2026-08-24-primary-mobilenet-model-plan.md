# Primary MobileNetV3 Model Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing model3 MobileNetV3Small asset the normal application model and give developers one date-labeled selector for all bundled model choices.

**Architecture:** Centralize model-selection identifiers and project-added dates in an offline-analysis catalog. The analysis runtime will accept one selection (`primary`, `seed123_model2`, `default`, `resnet50`, or `ensemble`) and load only the runtime(s) required by that selection. Developer storage, inspection workspace, app composition, and offline sync will all consume the same selection so online, offline, and queued analysis stay aligned.

**Tech Stack:** React 18, TypeScript, Vite, ONNX Runtime Web, Node test runner via `tsx`, Radix Select, localStorage-backed developer options.

## Global Constraints

- `primary` is the default active MobileNetV3 variant and points to the existing model3 ONNX asset.
- Regular users always use `primary`; alternate models are developer-only selections.
- The developer panel must show a single mutually exclusive model selector, not overlapping model booleans.
- Every selectable model displays its project-added date; dates are repository-added dates, not last-use timestamps.
- User-facing application copy must use neutral labels such as `Primary MobileNetV3`; it must not expose the provider/dataset name or internal model3 naming.
- Preserve ONNX preprocessing, class labels, model binaries, persistence schemas, and existing analysis fields; add only `resnet50` to the frontend analysis-source union.
- Keep the unrelated untracked file `frontend/public/letterheads/gcccs letterhead new - Copy.pdf` out of every commit.
- Deliver at least 10 meaningful implementation commits; the task boundaries below define 12 implementation commits in addition to the already committed design/spec changes.

---

## File map

- Create `frontend/src/features/offline-analysis/lib/model-catalog.ts`: selection union, catalog metadata, primary constant, validation, and date formatting.
- Create `frontend/tests/unit/features/offline-analysis/model-catalog.unit.test.ts`: catalog and date behavior.
- Modify `frontend/src/features/offline-analysis/lib/mobilenet-session.ts`: import the centralized MobileNet variant type and default the session to `primary`.
- Modify `frontend/tests/unit/features/offline-analysis/mobilenet-session.unit.test.ts`: primary default and switching assertions.
- Modify `frontend/src/features/developer-tools/model/developer-options-storage.ts`: persist `selectedModel` and migrate old boolean settings.
- Modify `frontend/src/features/developer-tools/index.ts`: export model-selection types/catalog and storage types.
- Modify `frontend/tests/unit/features/developer-tools/developer-options-storage.unit.test.ts`: new defaults and migration cases.
- Modify `frontend/src/features/offline-analysis/lib/analysis-runtime.ts`: selection orchestration, standalone ResNet50 mode, and primary ensemble component.
- Create `frontend/tests/unit/features/offline-analysis/analysis-runtime.unit.test.ts`: selection/readiness behavior using runtime boundaries.
- Modify `frontend/src/features/offline-analysis/index.ts`: expose the new selection API.
- Modify `frontend/src/app/app-composition.tsx`: inject `setActiveAnalysisModel` into offline sync.
- Modify `frontend/src/features/offline-sync/ui/offline-sync-manager.tsx`: resolve the same selection for queued scans and prewarming.
- Modify `frontend/src/features/offline-sync/index.ts`: export the renamed resolver.
- Modify `frontend/tests/unit/features/offline-sync/offline-sync-manager.unit.test.ts`: default, alternate, ResNet50, and ensemble selection cases.
- Modify `frontend/src/widgets/inspection-workspace/model/use-inspection-workspace.ts`: regular-user primary selection and developer-selected model wiring.
- Modify `frontend/src/entities/inspection/model/types.ts`: additive `resnet50` analysis source.
- Modify `frontend/src/features/offline-analysis/api/analyze-inspection.ts`: source label for standalone ResNet50.
- Modify `frontend/src/entities/inspection/ui/analysis-result-card.tsx`: source label for standalone ResNet50.
- Modify `frontend/tests/component/analysis/analysis-result-card.component.test.tsx`: source-label regression coverage.
- Modify `frontend/src/features/developer-tools/ui/developer-options-panel.tsx`: one selector with added dates and neutral labels.
- Modify `frontend/tests/unit/features/developer-tools/developer-ui.unit.test.ts`: selector copy/date coverage.
- Modify `frontend/tests/e2e/journeys/developer/developer-options.e2e.spec.ts`: selected-model persistence/default assertions.
- Modify `frontend/tests/e2e/journeys/inspector/camera-capture.e2e.spec.ts`: updated developer fixture shape.
- Modify `frontend/tests/e2e/offline/offline-ensemble.e2e.spec.ts`: primary MobileNetV3 ensemble fixture naming.
- Modify `tests/contracts/api-contract.test.ts`: allow the additive `resnet50` source in the shared contract fixture.
- Modify `documentation/PROJECT_OVERVIEW.md`: document primary model selection and developer alternatives.
- Modify `frontend/public/model/model3/README.txt`: document the primary asset and added date without provider branding.

---

### Task 1: Add the centralized model catalog contract

**Files:**
- Create: `frontend/src/features/offline-analysis/lib/model-catalog.ts`
- Create: `frontend/tests/unit/features/offline-analysis/model-catalog.unit.test.ts`

**Interfaces:**

```ts
export type MobileNetModelVariant = "primary" | "seed123_model2" | "default";
export type AnalysisModelSelection = MobileNetModelVariant | "resnet50" | "ensemble";
export const PRIMARY_ANALYSIS_MODEL: AnalysisModelSelection = "primary";
export const ANALYSIS_MODEL_CATALOG: readonly AnalysisModelCatalogEntry[];
export function isAnalysisModelSelection(value: unknown): value is AnalysisModelSelection;
export function formatModelAddedDate(addedOn: string | null): string;
```

- [ ] **Step 1: Write the failing tests**

```ts
test("catalog lists all selectable models with neutral labels and added dates", () => {
  assert.deepEqual(ANALYSIS_MODEL_CATALOG.map((entry) => entry.value), [
    "primary", "seed123_model2", "default", "resnet50", "ensemble",
  ]);
  assert.equal(ANALYSIS_MODEL_CATALOG[0].label, "Primary MobileNetV3");
  assert.equal(ANALYSIS_MODEL_CATALOG[0].addedOn, "2026-08-13");
  assert.ok(ANALYSIS_MODEL_CATALOG.every((entry) => entry.label.length > 0));
});

test("date formatter renders project-added dates without timezone drift", () => {
  assert.equal(formatModelAddedDate("2026-08-13"), "Aug 13, 2026");
  assert.equal(formatModelAddedDate(null), "Date unavailable");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm --prefix frontend exec -- tsx --test tests/unit/features/offline-analysis/model-catalog.unit.test.ts`

Expected: FAIL because the catalog module does not exist.

- [ ] **Step 3: Implement the catalog**

Use ISO date-only strings (`2026-05-01`, `2026-05-05`, `2026-05-19`, `2026-08-13`) and `Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })`. Give Ensemble a `null` date and a `composite` date label.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the same command; expected: PASS with 2 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/offline-analysis/lib/model-catalog.ts frontend/tests/unit/features/offline-analysis/model-catalog.unit.test.ts
git commit -m "feat: add model selection catalog"
```

### Task 2: Make the MobileNet session primary by default

**Files:**
- Modify: `frontend/src/features/offline-analysis/lib/mobilenet-session.ts`
- Modify: `frontend/tests/unit/features/offline-analysis/mobilenet-session.unit.test.ts`

**Interfaces:**

`MobileNetSession.activeModelVariant` is initialized to `"primary"`; `switchVariant` continues to invalidate the loaded session and increment `loadGeneration`.

- [ ] **Step 1: Change the existing test expectation to `primary` and add a primary switch test.**
- [ ] **Step 2: Run `npm --prefix frontend exec -- tsx --test tests/unit/features/offline-analysis/mobilenet-session.unit.test.ts` and verify the old default assertion fails.**
- [ ] **Step 3: Import `MobileNetModelVariant` from `model-catalog.ts`, remove the duplicate union, and initialize `activeModelVariant = "primary"`.**
- [ ] **Step 4: Run the focused session test and verify all tests pass.**
- [ ] **Step 5: Commit with `git commit -am "feat: default mobilenet session to primary"` after staging only the two task files.**

### Task 3: Replace boolean model flags with persisted selection and migration

**Files:**
- Modify: `frontend/src/features/developer-tools/model/developer-options-storage.ts`
- Modify: `frontend/src/features/developer-tools/index.ts`
- Modify: `frontend/tests/unit/features/developer-tools/developer-options-storage.unit.test.ts`

**Interfaces:**

```ts
export interface DeveloperOptionsFlags {
  selectedModel: AnalysisModelSelection;
  enableDebugFileUpload: boolean;
  bypassPreScanChecklist: boolean;
  persistAnalysisSnapshots: boolean;
  verboseOfflineSyncLogs: boolean;
  skipModelPrewarm: boolean;
  showModelInputPreview: boolean;
  disableRoiSegmentation: boolean;
}
```

`getDeveloperOptionsFlags` accepts old localStorage payloads and maps `enableModelEnsemble` to `ensemble`, `useRoboflowModel3` to `primary`, `useSeed123Model2` to `seed123_model2`, and an old all-default/no-explicit-choice payload to `primary`. A valid new `selectedModel` wins over legacy keys.

- [ ] **Step 1: Write failing tests for the primary default, explicit new selection, old ensemble migration, old primary migration, and invalid selection fallback.**
- [ ] **Step 2: Run `npm --prefix frontend exec -- tsx --test tests/unit/features/developer-tools/developer-options-storage.unit.test.ts` and verify RED.**
- [ ] **Step 3: Implement `selectedModel`, `isAnalysisModelSelection`, and the deterministic legacy migration in storage normalization.**
- [ ] **Step 4: Run the focused storage tests and verify GREEN.**
- [ ] **Step 5: Commit with `git commit -m "feat: persist explicit developer model selection"`.**

### Task 4: Add analysis-runtime selection orchestration

**Files:**
- Modify: `frontend/src/features/offline-analysis/lib/analysis-runtime.ts`
- Create: `frontend/tests/unit/features/offline-analysis/analysis-runtime.unit.test.ts`

**Interfaces:**

```ts
export type AnalysisMode = "ensemble" | "mobilenetv3" | "resnet50";
export function setActiveAnalysisModel(selection: AnalysisModelSelection): void;
export function getActiveAnalysisModel(): AnalysisModelSelection;
```

`setActiveAnalysisModel("primary" | "seed123_model2" | "default")` sets MobileNet mode and variant; `resnet50` sets standalone ResNet mode; `ensemble` sets ensemble mode and primary MobileNet variant. `isAnalysisReady` uses MobileNet readiness for MobileNet selections, ResNet readiness for ResNet50, and both readiness values for Ensemble. `loadActiveAnalysisModel` and `runActiveAnalysis` follow the same branch.

- [ ] **Step 1: Add failing tests for the default selection, each mode’s readiness requirement, and selection-to-runtime mapping.**
- [ ] **Step 2: Run `npm --prefix frontend exec -- tsx --test tests/unit/features/offline-analysis/analysis-runtime.unit.test.ts` and verify RED.**
- [ ] **Step 3: Implement the selection state and branches, preserving the existing ensemble fusion helper. Use a generic conversion helper so ResNet50 results produce `analysisSource: "resnet50"`.**
- [ ] **Step 4: Run the focused analysis-runtime tests and verify GREEN.**
- [ ] **Step 5: Commit with `git commit -m "feat: support explicit analysis model selection"`.**

### Task 5: Expose the selection API and update source labeling

**Files:**
- Modify: `frontend/src/features/offline-analysis/index.ts`
- Modify: `frontend/src/entities/inspection/model/types.ts`
- Modify: `frontend/src/features/offline-analysis/api/analyze-inspection.ts`
- Modify: `frontend/src/entities/inspection/ui/analysis-result-card.tsx`
- Modify: `frontend/tests/component/analysis/analysis-result-card.component.test.tsx`

- [ ] **Step 1: Add a failing component assertion that `analysis_source: "resnet50"` renders `Source: ResNet50 ONNX`, and add a source-label assertion in the analysis API test seam.**
- [ ] **Step 2: Run the focused component test and verify the ResNet label fails.**
- [ ] **Step 3: Export `setActiveAnalysisModel`, `getActiveAnalysisModel`, `AnalysisModelSelection`, and catalog values; add `resnet50` to `AnalysisResult.analysis_source`; map the runtime source to `ResNet50 ONNX` in both API explanation and result card.**
- [ ] **Step 4: Run `npm --prefix frontend run test:component -- --test-name-pattern="ResNet50|source"` and verify GREEN.**
- [ ] **Step 5: Commit with `git commit -m "feat: label standalone resnet analysis"`.**

### Task 6: Wire app composition to the unified selector

**Files:**
- Modify: `frontend/src/app/app-composition.tsx`

**Interfaces:**

`offlineSyncDependencies.setActiveAnalysisModel` has type `(selection: AnalysisModelSelection) => void` and replaces the two old mode/variant setters.

- [ ] **Step 1: Add a temporary failing type-level usage in the offline sync dependency object expecting `setActiveAnalysisModel`.**
- [ ] **Step 2: Run `npm --prefix frontend run typecheck` and verify the dependency interface is missing.**
- [ ] **Step 3: Replace the two imports and dependency properties with `setActiveAnalysisModel`.**
- [ ] **Step 4: Run typecheck and verify this integration compiles.**
- [ ] **Step 5: Commit with `git commit -m "refactor: inject unified model selector"`.**

### Task 7: Align offline sync with selected model and standalone ResNet50

**Files:**
- Modify: `frontend/src/features/offline-sync/ui/offline-sync-manager.tsx`
- Modify: `frontend/src/features/offline-sync/index.ts`
- Modify: `frontend/tests/unit/features/offline-sync/offline-sync-manager.unit.test.ts`

**Interfaces:**

```ts
export function resolveActiveModelSelection(
  user: SyncUser | null,
  isAdmin: boolean,
  developerFlags: Pick<DeveloperOptionsFlags, "selectedModel">,
  isDeveloperUnlocked: boolean,
): AnalysisModelSelection;
```

Locked/anonymous sessions return `primary`. Unlocked admins return `developerFlags.selectedModel`. Queue drain and prewarm call `dependencies.setActiveAnalysisModel(selection)` once, including when the selection is `resnet50` or `ensemble`.

- [ ] **Step 1: Rewrite tests first for primary default, explicit seed123, legacy, ResNet50, and ensemble selections.**
- [ ] **Step 2: Run `npm --prefix frontend exec -- tsx --test tests/unit/features/offline-sync/offline-sync-manager.unit.test.ts` and verify the old resolver expectations fail.**
- [ ] **Step 3: Implement the new resolver and replace mode/variant calls in queue drain, anonymous prewarm, and online prewarm.**
- [ ] **Step 4: Run the focused sync tests and verify GREEN.**
- [ ] **Step 5: Commit with `git commit -m "feat: align offline sync with selected model"`.**

### Task 8: Wire inspection workspace model selection

**Files:**
- Modify: `frontend/src/widgets/inspection-workspace/model/use-inspection-workspace.ts`
- Modify: `frontend/tests/unit/features/inspection-workspace/inspection-analysis.unit.test.ts`

- [ ] **Step 1: Add a failing workspace selection test proving regular users resolve `primary` and unlocked admins resolve their stored selection.**
- [ ] **Step 2: Run the focused workspace test and verify RED.**
- [ ] **Step 3: Replace the boolean precedence tree with one `selectedModel` choice gated by admin/unlocked status; call `setActiveAnalysisModel` and update readiness dependencies.**
- [ ] **Step 4: Run the focused workspace tests and verify GREEN.**
- [ ] **Step 5: Commit with `git commit -m "feat: make primary model default in inspections"`.**

### Task 9: Build the date-labeled developer selector

**Files:**
- Modify: `frontend/src/features/developer-tools/ui/developer-options-panel.tsx`
- Modify: `frontend/tests/unit/features/developer-tools/developer-ui.unit.test.ts`

- [ ] **Step 1: Add failing UI assertions for one model selector, all five catalog labels, each added date, and absence of the provider/dataset name.**
- [ ] **Step 2: Run the focused UI test and verify RED.**
- [ ] **Step 3: Remove the model boolean definitions from the toggle list. Add a Radix `Select` bound to `flags.selectedModel`, persist changes through `setDeveloperOptionsFlags`, and render `formatModelAddedDate(entry.addedOn)` in each option. Keep unrelated debug toggles as switches.**
- [ ] **Step 4: Run the focused developer UI tests and verify GREEN.**
- [ ] **Step 5: Commit with `git commit -m "feat: add date-labeled developer model selector"`.**

### Task 10: Update developer and offline fixtures to the new persisted shape

**Files:**
- Modify: `frontend/tests/e2e/journeys/developer/developer-options.e2e.spec.ts`
- Modify: `frontend/tests/e2e/journeys/inspector/camera-capture.e2e.spec.ts`
- Modify: `frontend/tests/e2e/offline/offline-ensemble.e2e.spec.ts`
- Modify: `frontend/tests/unit/features/developer-tools/developer-options-public-api.unit.test.ts`

- [ ] **Step 1: Update fixtures to use `selectedModel` and add a failing assertion that the default is `primary`.**
- [ ] **Step 2: Run the affected unit tests and verify failures identify stale boolean fields.**
- [ ] **Step 3: Replace old fixture fields, assert the selector options use neutral copy, and set ensemble fixtures to use the primary MobileNetV3 component.**
- [ ] **Step 4: Run the affected unit tests and typecheck; verify GREEN.**
- [ ] **Step 5: Commit with `git commit -m "test: update model selection fixtures"`.**

### Task 11: Update shared contract coverage and model documentation

**Files:**
- Modify: `tests/contracts/api-contract.test.ts`
- Modify: `documentation/PROJECT_OVERVIEW.md`
- Create: `frontend/public/model/model3/README.txt`

- [ ] **Step 1: Add the `resnet50` source case to the contract fixture and a documentation assertion for the neutral primary label/date.**
- [ ] **Step 2: Run `npm run test:contract` and `node scripts/check-documentation.mjs`; verify the new contract/documentation assertions fail until the fixture and docs are updated.**
- [ ] **Step 3: Document the primary model, selector choices, and project-added dates; keep the model asset README free of provider branding.**
- [ ] **Step 4: Run the contract tests and verify GREEN.**
- [ ] **Step 5: Commit with `git commit -m "docs: document primary model catalog"`.**

### Task 12: Full regression verification and final implementation commit

**Files:**
- Modify only files required by verified lint/type/test failures from Tasks 1–11.

- [ ] **Step 1: Run the complete focused regression set:**

```bash
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run test:unit
npm --prefix frontend run test:component
npm --prefix frontend run build
npm test
```

- [ ] **Step 2: If a command fails, add or update a regression test first, run it red, apply the minimal fix, rerun the relevant command, and record the result in the commit.**
- [ ] **Step 3: Run `git diff --check` and `git status --short`; verify only intended tracked changes plus the pre-existing unrelated PDF remain.**
- [ ] **Step 4: Commit any verified final correction as `git commit -m "fix: complete primary model wiring"`; do not commit the unrelated PDF.**
- [ ] **Step 5: Run `git log -12 --oneline` and verify at least 10 implementation commits exist after the design commits.**

## Final verification checklist

- [ ] `primary` is the MobileNet session default.
- [ ] Regular users and queued scans use `primary`.
- [ ] Developers can choose Primary MobileNetV3, Seed123 MobileNetV3, Legacy MobileNetV3, ResNet50, or Ensemble.
- [ ] Ensemble uses primary MobileNetV3 plus ResNet50.
- [ ] Standalone ResNet50 results expose and render `analysis_source: "resnet50"`.
- [ ] Every selector option shows its project-added date.
- [ ] User-facing copy contains no provider/dataset name or internal model3 name.
- [ ] Existing preprocessing and class-label behavior remains unchanged.
- [ ] All verification commands finish with exit code 0.
- [ ] At least 10 meaningful implementation commits are present.
