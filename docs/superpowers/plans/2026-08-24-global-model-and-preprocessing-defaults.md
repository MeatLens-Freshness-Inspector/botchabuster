# Global Model and Preprocessing Defaults Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the newest Primary MobileNetV3 and non-segmented preprocessing the application defaults, while restricting model and segmentation overrides to unlocked developer accounts.

**Architecture:** Add one shared offline-analysis constant for the disabled-segmentation default. Keep `PRIMARY_ANALYSIS_MODEL` as the model default, and make both inspection workspace and offline-sync selectors require `isDeveloper && isDeveloperUnlocked` before reading developer selections. Resolve the effective segmentation flag in a small workspace-owned helper so capture preview and analysis receive the same role-gated value.

**Tech Stack:** TypeScript, React hooks, Node test runner, Vite, Playwright.

## Global Constraints

- Regular users always use the newest `primary` analysis model.
- ROI segmentation is disabled for regular users and all non-developer sessions.
- Only an unlocked developer account may activate persisted alternative model or segmentation settings.
- Existing explicit persisted developer values remain unchanged.
- Do not modify model assets, backend schema, segmentation mathematics, or public inspector controls.
- Keep all work in the current `master` worktree.

---

## File Map

- Create `frontend/src/features/offline-analysis/lib/preprocessing-defaults.ts` for the shared disabled-segmentation default.
- Modify `frontend/src/features/offline-analysis/index.ts` to publish the default.
- Modify `frontend/src/features/inspection-capture/model/model-input-preview.ts` and `camera-session.ts` so omitted capture options use the shared default.
- Modify `frontend/src/features/offline-analysis/api/analyze-inspection.ts`, `lib/analysis-runtime.ts`, and `lib/mobilenet-runtime.ts` so omitted analysis options use the shared default.
- Create `frontend/src/widgets/inspection-workspace/model/segmentation-selection.ts` for the role-gated effective segmentation helper.
- Modify `frontend/src/widgets/inspection-workspace/model/use-inspection-workspace.ts` to use `isDeveloper`, the effective model selector, and the effective segmentation selector.
- Modify `frontend/src/widgets/inspection-workspace/model/analysis-model-selection.ts` to require an explicit developer role.
- Modify `frontend/src/features/offline-sync/ui/offline-sync-manager.tsx` and `frontend/src/app/app-composition.tsx` to gate developer model/options usage by developer role.
- Update unit and E2E fixtures under `frontend/tests/unit` and `frontend/tests/e2e` to document the new defaults.

### Task 1: Add the shared disabled-segmentation contract

**Files:**
- Create: `frontend/src/features/offline-analysis/lib/preprocessing-defaults.ts`
- Modify: `frontend/src/features/offline-analysis/index.ts`
- Create: `frontend/tests/unit/features/offline-analysis/preprocessing-defaults.unit.test.ts`

**Interfaces:**
- Produces `DEFAULT_DISABLE_ROI_SEGMENTATION: true` from the offline-analysis public API.

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_DISABLE_ROI_SEGMENTATION } from "../../../../src/features/offline-analysis";

test("application preprocessing defaults disable ROI segmentation", () => {
  assert.equal(DEFAULT_DISABLE_ROI_SEGMENTATION, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec --yes -- tsx --test frontend/tests/unit/features/offline-analysis/preprocessing-defaults.unit.test.ts`

Expected: FAIL because the public constant is not defined.

- [ ] **Step 3: Write the minimal implementation**

```ts
// frontend/src/features/offline-analysis/lib/preprocessing-defaults.ts
export const DEFAULT_DISABLE_ROI_SEGMENTATION = true;
```

Export it from `frontend/src/features/offline-analysis/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm exec --yes -- tsx --test frontend/tests/unit/features/offline-analysis/preprocessing-defaults.unit.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/offline-analysis/index.ts frontend/src/features/offline-analysis/lib/preprocessing-defaults.ts frontend/tests/unit/features/offline-analysis/preprocessing-defaults.unit.test.ts
git commit -m "feat: define disabled segmentation default"
```

### Task 2: Apply the default to capture-preview preparation

**Files:**
- Modify: `frontend/src/features/inspection-capture/model/model-input-preview.ts`
- Modify: `frontend/src/features/inspection-capture/model/camera-session.ts`
- Modify: `frontend/tests/unit/features/inspection-capture/model-input-preview.unit.test.ts`

**Interfaces:**
- `resolveModelInputPreviewOptions` accepts an omitted `disableRoiSegmentation` and treats it as `DEFAULT_DISABLE_ROI_SEGMENTATION`.
- `useCameraCapture` defaults its `disableRoiSegmentation` prop to `true`.

- [ ] **Step 1: Write the failing test**

Add:

```ts
test("segmented preview disables ROI segmentation when no override is supplied", () => {
  assert.deepEqual(resolveModelInputPreviewOptions({
    preprocessContract: "segmented_center_roi",
    guideBox: { x: 0.1, y: 0.1, size: 0.8 },
  }), {
    guideBox: null,
    forceCenterCrop: true,
    applySegmentation: false,
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec --yes -- tsx --test frontend/tests/unit/features/inspection-capture/model-input-preview.unit.test.ts`

Expected: FAIL at type-check or assertion because the option currently requires a boolean and defaults to segmented preprocessing.

- [ ] **Step 3: Write the minimal implementation**

Import `DEFAULT_DISABLE_ROI_SEGMENTATION`, make the preview option property optional, and resolve it before returning:

```ts
const segmentationDisabled = disableRoiSegmentation ?? DEFAULT_DISABLE_ROI_SEGMENTATION;
return {
  guideBox: isSegmentedCenterRoi ? null : guideBox,
  forceCenterCrop: isSegmentedCenterRoi,
  applySegmentation: isSegmentedCenterRoi && !segmentationDisabled,
};
```

Change the camera hook destructuring default from `false` to `true`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm exec --yes -- tsx --test frontend/tests/unit/features/inspection-capture/model-input-preview.unit.test.ts`

Expected: all preview tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/inspection-capture/model/model-input-preview.ts frontend/src/features/inspection-capture/model/camera-session.ts frontend/tests/unit/features/inspection-capture/model-input-preview.unit.test.ts
git commit -m "feat: disable segmentation in capture previews by default"
```

### Task 3: Apply the default to direct offline analysis

**Files:**
- Modify: `frontend/src/features/offline-analysis/api/analyze-inspection.ts`
- Modify: `frontend/src/features/offline-analysis/lib/analysis-runtime.ts`
- Modify: `frontend/src/features/offline-analysis/lib/mobilenet-runtime.ts`
- Modify: `frontend/tests/unit/features/offline-analysis/analysis-input-mode.unit.test.ts`

**Interfaces:**
- `analyzeOffline`, `runActiveAnalysis`, and MobileNet classification use `DEFAULT_DISABLE_ROI_SEGMENTATION` when their optional flag is omitted.

- [ ] **Step 1: Write the failing test**

Add a default-path assertion to the MobileNet input-mode coverage by making the helper option optional:

```ts
test("the MobileNet default omits the guide box when segmentation is not configured", () => {
  assert.equal(resolveMobileNetGuideBox({
    preprocessContract: "segmented_center_roi",
    guideBox: { x: 0.1, y: 0.1, size: 0.8 },
  }), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec --yes -- tsx --test frontend/tests/unit/features/offline-analysis/analysis-input-mode.unit.test.ts`

Expected: FAIL because the helper requires `disableRoiSegmentation` and currently treats omitted behavior as enabled segmentation.

- [ ] **Step 3: Write the minimal implementation**

Use the shared default in `resolveMobileNetGuideBox`, `analyzeOffline`, and the MobileNet runtime option passed to the classifier. Keep explicit `false` behavior unchanged for developer comparisons.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm exec --yes -- tsx --test frontend/tests/unit/features/offline-analysis/analysis-input-mode.unit.test.ts frontend/tests/unit/features/offline-analysis/analysis-runtime.unit.test.ts`

Expected: all selected analysis tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/offline-analysis/api/analyze-inspection.ts frontend/src/features/offline-analysis/lib/analysis-runtime.ts frontend/src/features/offline-analysis/lib/mobilenet-runtime.ts frontend/tests/unit/features/offline-analysis/analysis-input-mode.unit.test.ts
git commit -m "feat: disable segmentation in offline analysis by default"
```

### Task 4: Make the developer default and persisted compatibility explicit

**Files:**
- Modify: `frontend/src/features/developer-tools/model/developer-options-storage.ts`
- Modify: `frontend/tests/unit/features/developer-tools/developer-options-storage.unit.test.ts`
- Modify: `frontend/tests/e2e/journeys/developer/developer-options.e2e.spec.ts`

**Interfaces:**
- New developer state starts with `disableRoiSegmentation: true`.
- Explicit stored `false` remains `false` after normalization.

- [ ] **Step 1: Write the failing tests**

Change the default assertion to:

```ts
test("new developer flag state selects the primary model and disables ROI segmentation", () => {
  assert.equal(DEFAULT_DEVELOPER_OPTIONS_FLAGS.selectedModel, "primary");
  assert.equal(DEFAULT_DEVELOPER_OPTIONS_FLAGS.disableRoiSegmentation, true);
});
```

Add a round-trip fixture with `disableRoiSegmentation: false` and assert it remains `false`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec --yes -- tsx --test frontend/tests/unit/features/developer-tools/developer-options-storage.unit.test.ts`

Expected: FAIL because the current default is `false`.

- [ ] **Step 3: Write the minimal implementation**

Change only `DEFAULT_DEVELOPER_OPTIONS_FLAGS.disableRoiSegmentation` to `true`; leave the spread normalization and explicit stored values intact.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm exec --yes -- tsx --test frontend/tests/unit/features/developer-tools/developer-options-storage.unit.test.ts`

Expected: all storage tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/developer-tools/model/developer-options-storage.ts frontend/tests/unit/features/developer-tools/developer-options-storage.unit.test.ts frontend/tests/e2e/journeys/developer/developer-options.e2e.spec.ts
git commit -m "feat: default developer segmentation option to disabled"
```

### Task 5: Restrict inspection model selection to developers

**Files:**
- Modify: `frontend/src/widgets/inspection-workspace/model/analysis-model-selection.ts`
- Modify: `frontend/src/widgets/inspection-workspace/model/use-inspection-workspace.ts`
- Modify: `frontend/tests/unit/features/inspection-workspace/inspection-model-selection.unit.test.ts`

**Interfaces:**
- `resolveInspectionModelSelection(user, isDeveloper, isDeveloperUnlocked, selectedModel)` returns `PRIMARY_ANALYSIS_MODEL` unless all developer conditions are true.

- [ ] **Step 1: Write the failing test**

Change the existing unlocked-admin test to distinguish developer and non-developer administrators:

```ts
test("inspection workspace uses the selected model only for unlocked developers", () => {
  assert.equal(resolveInspectionModelSelection({ id: "admin-1" }, false, true, "ensemble"), "primary");
  assert.equal(resolveInspectionModelSelection({ id: "developer-1" }, true, true, "ensemble"), "ensemble");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec --yes -- tsx --test frontend/tests/unit/features/inspection-workspace/inspection-model-selection.unit.test.ts`

Expected: FAIL because the helper currently accepts `isAdmin` as its role gate.

- [ ] **Step 3: Write the minimal implementation**

Rename the role parameter to `isDeveloper`, retain the user and unlock checks, and update the workspace hook to destructure `isDeveloper` from `useAuth` and pass it to the selector. Load developer flags only when `isDeveloper` is true.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm exec --yes -- tsx --test frontend/tests/unit/features/inspection-workspace/inspection-model-selection.unit.test.ts`

Expected: all selector tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/widgets/inspection-workspace/model/analysis-model-selection.ts frontend/src/widgets/inspection-workspace/model/use-inspection-workspace.ts frontend/tests/unit/features/inspection-workspace/inspection-model-selection.unit.test.ts
git commit -m "feat: restrict model overrides to developers"
```

### Task 6: Add and wire role-gated segmentation resolution

**Files:**
- Create: `frontend/src/widgets/inspection-workspace/model/segmentation-selection.ts`
- Modify: `frontend/src/widgets/inspection-workspace/model/use-inspection-workspace.ts`
- Create: `frontend/tests/unit/features/inspection-workspace/segmentation-selection.unit.test.ts`

**Interfaces:**
- Produces `resolveInspectionSegmentationDisabled(isDeveloper, isDeveloperUnlocked, storedValue): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
test("segmentation stays disabled outside an unlocked developer session", () => {
  assert.equal(resolveInspectionSegmentationDisabled(false, true, false), true);
  assert.equal(resolveInspectionSegmentationDisabled(true, false, false), true);
  assert.equal(resolveInspectionSegmentationDisabled(true, true, true), true);
  assert.equal(resolveInspectionSegmentationDisabled(true, true, false), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec --yes -- tsx --test frontend/tests/unit/features/inspection-workspace/segmentation-selection.unit.test.ts`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Write the minimal implementation**

```ts
export function resolveInspectionSegmentationDisabled(
  isDeveloper: boolean,
  isDeveloperUnlocked: boolean,
  storedValue: boolean,
): boolean {
  if (!isDeveloper || !isDeveloperUnlocked) return true;
  return storedValue;
}
```

Use this helper for both `analyzeOffline(... disableRoiSegmentation)` and the returned `disableRoiSegmentation` view-model property. Include it in the callback dependencies.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm exec --yes -- tsx --test frontend/tests/unit/features/inspection-workspace/segmentation-selection.unit.test.ts frontend/tests/unit/features/inspection-workspace/inspection-model-selection.unit.test.ts`

Expected: all selected workspace tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/widgets/inspection-workspace/model/segmentation-selection.ts frontend/src/widgets/inspection-workspace/model/use-inspection-workspace.ts frontend/tests/unit/features/inspection-workspace/segmentation-selection.unit.test.ts
git commit -m "feat: gate segmentation overrides by developer access"
```

### Task 7: Restrict offline-sync model and developer flags to developers

**Files:**
- Modify: `frontend/src/features/offline-sync/ui/offline-sync-manager.tsx`
- Modify: `frontend/src/app/app-composition.tsx`
- Modify: `frontend/tests/unit/features/offline-sync/offline-sync-manager.unit.test.ts`

**Interfaces:**
- `resolveActiveModelSelection(user, isDeveloper, developerFlags, isDeveloperUnlocked)` returns `primary` for every non-developer session.
- `OfflineSyncManagerProps` receives `isDeveloper` separately from `isAdmin`.

- [ ] **Step 1: Write the failing test**

Update the fixtures:

```ts
test("offline sync ignores developer model choices for non-developers", () => {
  assert.equal(
    resolveActiveModelSelection({ id: "admin-1" }, false, { selectedModel: "ensemble" }, true),
    "primary",
  );
  assert.equal(
    resolveActiveModelSelection({ id: "developer-1" }, true, { selectedModel: "ensemble" }, true),
    "ensemble",
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec --yes -- tsx --test frontend/tests/unit/features/offline-sync/offline-sync-manager.unit.test.ts`

Expected: FAIL because the helper currently treats `isAdmin` as sufficient.

- [ ] **Step 3: Write the minimal implementation**

Replace `isAdmin` with `isDeveloper` in the selector and prop. In `AuthOfflineSyncManager`, pass `isDeveloper`. When the current user is not a developer, use safe defaults for model/prewarm/log behavior instead of loading developer flags; still keep `primary` as the active model.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm exec --yes -- tsx --test frontend/tests/unit/features/offline-sync/offline-sync-manager.unit.test.ts`

Expected: all offline-sync selector tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/offline-sync/ui/offline-sync-manager.tsx frontend/src/app/app-composition.tsx frontend/tests/unit/features/offline-sync/offline-sync-manager.unit.test.ts
git commit -m "feat: keep offline sync on the primary model for users"
```

### Task 8: Update developer-facing regression fixtures and documentation

**Files:**
- Modify: `frontend/tests/e2e/journeys/developer/developer-options.e2e.spec.ts`
- Modify: `docs/superpowers/specs/2026-08-24-global-preprocessing-and-model-defaults-design.md` only if implementation wording requires correction.

- [ ] **Step 1: Write the failing assertion**

Update the E2E expectation for the initial developer option to `true` and add the visible model assertion that the primary catalog entry remains selected by default.

- [ ] **Step 2: Run the focused E2E test**

Run: `npm run test:e2e --workspace frontend -- developer-options.e2e.spec.ts`

Expected: the stale default assertion fails before the fixture is updated.

- [ ] **Step 3: Update the fixture and keep neutral UI copy**

Change only the expected default; do not expose internal asset/provider names in user-facing labels.

- [ ] **Step 4: Run the focused E2E test**

Run: `npm run test:e2e --workspace frontend -- developer-options.e2e.spec.ts`

Expected: the developer options journey passes.

- [ ] **Step 5: Commit**

```bash
git add frontend/tests/e2e/journeys/developer/developer-options.e2e.spec.ts docs/superpowers/specs/2026-08-24-global-preprocessing-and-model-defaults-design.md
git commit -m "test: align developer defaults with global preprocessing"
```

### Task 9: Run focused static and regression verification

- [ ] **Step 1: Run affected unit tests**

Run: `npm run test:unit -w frontend -- --test-name-pattern="(preprocessing|model-input|analysis-input|developer flag|inspection workspace|offline sync)"`

Expected: zero failures.

- [ ] **Step 2: Run frontend typecheck and lint**

Run: `npm run typecheck -w frontend` and `npm run lint -w frontend`

Expected: typecheck exits 0; lint has no errors.

- [ ] **Step 3: Run the frontend build**

Run: `npm run build -w frontend`

Expected: Vite build exits 0 and model assets remain synchronized.

- [ ] **Step 4: Commit any required test-only correction**

If verification exposes a stale fixture or type contract, update only the affected test/fixture, rerun its focused command, and commit it as:

```bash
git commit -m "test: reconcile global model defaults"
```

### Task 10: Run the complete verification suite and audit `master`

- [ ] **Step 1: Run the full root suite**

Run: `npm test`

Expected: every script, documentation, frontend, backend, integration, architecture, and contract suite reports zero failures.

- [ ] **Step 2: Run critical frontend E2E**

Run: `npm run test:e2e:critical -w frontend`

Expected: all critical journeys pass.

- [ ] **Step 3: Audit the worktree**

Run: `git diff --check; git status --short; git log --oneline -12`

Expected: no whitespace errors, implementation commits are on `master`, and only the pre-existing untracked letterhead PDF remains.

- [ ] **Step 4: Commit only if verification generated tracked artifacts**

Restore generated tracked reports without touching the pre-existing PDF, then rerun `git status --short` and leave the worktree ready for handoff.
