# Disable Gray ROI Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted developer toggle that disables segmented ROI preprocessing in favor of a normal center crop, while making seed123 the default MobileNetV3 developer model instead of Roboflow model3.

**Architecture:** Extend the existing per-user `DeveloperOptionsFlags` local-storage contract and Developer Toggles panel. Thread the new flag through the inspection workspace into camera preview preprocessing and MobileNet analysis; keep the mode decision explicit at each boundary so preview and inference cannot silently diverge. Existing stored values remain authoritative, while default values change only for missing flags.

**Tech Stack:** React 18, TypeScript, Vite, ONNX Runtime Web, Node built-in test runner via `tsx --test`, Playwright, localStorage-backed developer settings.

## Global Constraints

- The new flag is browser-local and scoped to the signed-in developer account.
- `disableRoiSegmentation` defaults to `false`; segmented-center-ROI behavior remains the default.
- `useRoboflowModel3` defaults to `false`; seed123 remains the default comparison model for new/default flag state.
- Existing stored `true` values are preserved by the default-plus-stored merge.
- The new mode must affect both model-input preview and analysis, not only the settings UI.
- Legacy model variants do not use the gray ROI preprocessing and retain their existing guide-box behavior.
- No backend/database setting, public inspector control, model asset change, or segmentation-algorithm change is included.
- Production code is written only after a focused failing test has been observed.

---

### Task 1: Add the persisted flag and correct the default model

**Files:**
- Modify: `frontend/src/features/developer-tools/model/developer-options-storage.ts`
- Modify: `frontend/src/features/developer-tools/ui/developer-options-panel.tsx`
- Create: `frontend/tests/unit/features/developer-tools/developer-options-storage.unit.test.ts`
- Modify: `frontend/tests/e2e/journeys/developer/developer-options.e2e.spec.ts`

**Interfaces:**
- Consumes: existing `DeveloperOptionsFlags`, `DEFAULT_DEVELOPER_OPTIONS_FLAGS`, `getDeveloperOptionsFlags`, `setDeveloperOptionsFlags`, and `FLAG_DEFINITIONS`.
- Produces: `disableRoiSegmentation` on every normalized developer flag object and `useRoboflowModel3: false` in default state.

- [ ] **Step 1: Write failing storage/default tests**

Create a small in-memory `Storage` implementation in the unit test and install it as `window.localStorage` for the test scope. Add tests equivalent to:

```ts
test("new developer flag state disables Roboflow and gray ROI preprocessing by default", () => {
  assert.equal(DEFAULT_DEVELOPER_OPTIONS_FLAGS.useRoboflowModel3, false);
  assert.equal(DEFAULT_DEVELOPER_OPTIONS_FLAGS.disableRoiSegmentation, false);
});

test("stored developer choices survive normalization", () => {
  setDeveloperOptionsFlags("developer-1", {
    ...DEFAULT_DEVELOPER_OPTIONS_FLAGS,
    useRoboflowModel3: true,
    disableRoiSegmentation: true,
  });

  const flags = getDeveloperOptionsFlags("developer-1");
  assert.equal(flags.useRoboflowModel3, true);
  assert.equal(flags.disableRoiSegmentation, true);
});

test("older stored payloads receive the new false default", () => {
  window.localStorage.setItem(
    "meatlens-developer-options-flags:developer-2",
    JSON.stringify({ useSeed123Model2: true }),
  );

  assert.equal(getDeveloperOptionsFlags("developer-2").disableRoiSegmentation, false);
});
```

- [ ] **Step 2: Run the focused tests and verify the expected failure**

Run:

```bash
npm run test:unit -w frontend -- --test-name-pattern="developer flag|stored developer|older stored"
```

Expected: FAIL because `disableRoiSegmentation` is not yet part of the flag type/default object and Roboflow is still defaulted on.

- [ ] **Step 3: Implement the flag contract and panel entry**

In `DeveloperOptionsFlags`, add:

```ts
disableRoiSegmentation: boolean;
```

In `DEFAULT_DEVELOPER_OPTIONS_FLAGS`, set:

```ts
useRoboflowModel3: false,
disableRoiSegmentation: false,
```

Add this definition to `FLAG_DEFINITIONS` near the existing model-input preview option:

```ts
{
  key: "disableRoiSegmentation",
  label: "Disable gray ROI background",
  description: "Uses the original center-cropped 224x224 image instead of segmented ROI preprocessing.",
},
```

Do not change `getDeveloperOptionsFlags`; its existing default-spread plus stored-spread behavior is the compatibility path for old local-storage payloads.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run:

```bash
npm run test:unit -w frontend -- --test-name-pattern="developer flag|stored developer|older stored"
```

Expected: PASS.

- [ ] **Step 5: Add the default-model regression assertion**

Extend `frontend/tests/e2e/journeys/developer/developer-options.e2e.spec.ts` so it asserts:

```ts
expect(DEFAULT_DEVELOPER_OPTIONS_FLAGS.enableModelEnsemble).toBe(false);
expect(DEFAULT_DEVELOPER_OPTIONS_FLAGS.useRoboflowModel3).toBe(false);
expect(DEFAULT_DEVELOPER_OPTIONS_FLAGS.useSeed123Model2).toBe(true);
```

- [ ] **Step 6: Commit the settings change**

```bash
git add frontend/src/features/developer-tools/model/developer-options-storage.ts frontend/src/features/developer-tools/ui/developer-options-panel.tsx frontend/tests/unit/features/developer-tools/developer-options-storage.unit.test.ts frontend/tests/e2e/journeys/developer/developer-options.e2e.spec.ts
git commit -m "feat: add gray ROI developer flag and seed123 default"
```

### Task 2: Make camera preview preprocessing respond to the flag

**Files:**
- Create: `frontend/src/features/inspection-capture/model/model-input-preview.ts`
- Create: `frontend/tests/unit/features/inspection-capture/model-input-preview.unit.test.ts`
- Modify: `frontend/src/features/inspection-capture/model/types.ts`
- Modify: `frontend/src/features/inspection-capture/model/camera-session.ts`
- Modify: `frontend/src/widgets/inspection-workspace/model/types.ts`
- Modify: `frontend/src/widgets/inspection-workspace/model/use-inspection-workspace.ts`
- Modify: `frontend/src/widgets/inspection-workspace/ui/inspection-workspace.tsx`
- Modify: `frontend/src/widgets/inspection-workspace/ui/InspectCaptureSection.tsx`

**Interfaces:**
- Consumes: `disableRoiSegmentation` from `DeveloperOptionsFlags`, `getActiveModelPreprocessContract`, `SquareGuideBox`, and `ModelInputPreparationOptions`.
- Produces: a pure preview-preprocessing decision and a `disableRoiSegmentation` prop reaching `useCameraCapture`.

- [ ] **Step 1: Write failing pure-policy tests**

Create `resolveModelInputPreviewOptions` with this behavior:

```ts
const guideBox = { x: 0.1, y: 0.1, size: 0.8 };

assert.deepEqual(resolveModelInputPreviewOptions({
  preprocessContract: "segmented_center_roi",
  guideBox,
  disableRoiSegmentation: false,
}), {
  guideBox: null,
  forceCenterCrop: true,
  applySegmentation: true,
});

assert.deepEqual(resolveModelInputPreviewOptions({
  preprocessContract: "segmented_center_roi",
  guideBox,
  disableRoiSegmentation: true,
}), {
  guideBox: null,
  forceCenterCrop: true,
  applySegmentation: false,
});

assert.deepEqual(resolveModelInputPreviewOptions({
  preprocessContract: "legacy",
  guideBox,
  disableRoiSegmentation: true,
}), {
  guideBox,
  forceCenterCrop: false,
  applySegmentation: false,
});
```

- [ ] **Step 2: Run the policy test and verify it fails**

Run:

```bash
npm run test:unit -w frontend -- --test-name-pattern="model input preview"
```

Expected: FAIL because the policy helper does not exist.

- [ ] **Step 3: Implement the preview policy and prop plumbing**

Implement `resolveModelInputPreviewOptions` so only the `segmented_center_roi` contract forces a center crop; the new flag changes `applySegmentation` from `true` to `false` for that contract. Add `disableRoiSegmentation?: boolean` to `CameraCaptureProps`, pass it from `InspectCaptureSection`, and expose it from `InspectPageViewModel`.

Update `useCameraCapture` so `updateModelInputPreview` depends on `disableRoiSegmentation` and calls the policy helper before `createModelInputImageFile`. Add an effect that reruns preview preparation when the setting changes and an uploaded source already exists. Keep the existing request-id cancellation logic so an older asynchronous preview cannot replace the latest mode.

- [ ] **Step 4: Run the focused preview tests**

Run:

```bash
npm run test:unit -w frontend -- --test-name-pattern="model input preview"
npm run typecheck -w frontend
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 5: Commit the preview path**

```bash
git add frontend/src/features/inspection-capture frontend/src/widgets/inspection-workspace frontend/tests/unit/features/inspection-capture/model-input-preview.unit.test.ts
git commit -m "feat: wire gray ROI toggle into capture preview"
```

### Task 3: Make actual MobileNet analysis honor the flag

**Files:**
- Modify: `frontend/src/features/offline-analysis/lib/analysis-runtime.ts`
- Modify: `frontend/src/features/offline-analysis/lib/mobilenet-runtime.ts`
- Modify: `frontend/src/features/offline-analysis/api/analyze-inspection.ts`
- Modify: `frontend/src/widgets/inspection-workspace/model/use-inspection-workspace.ts`
- Create: `frontend/tests/unit/features/offline-analysis/analysis-input-mode.unit.test.ts`

**Interfaces:**
- Consumes: `disableRoiSegmentation` from the workspace and the active `ModelPreprocessContract`.
- Produces: analysis options forwarded to both analysis branches, with MobileNet-only guide-box suppression for segmented-center-ROI variants.

- [ ] **Step 1: Write failing analysis mode tests**

Add a pure `resolveMobileNetGuideBox` helper and test:

```ts
const guideBox = { x: 0.1, y: 0.1, size: 0.8 };

assert.equal(resolveMobileNetGuideBox({
  preprocessContract: "segmented_center_roi",
  guideBox,
  disableRoiSegmentation: true,
}), null);

assert.deepEqual(resolveMobileNetGuideBox({
  preprocessContract: "segmented_center_roi",
  guideBox,
  disableRoiSegmentation: false,
}), guideBox);

assert.deepEqual(resolveMobileNetGuideBox({
  preprocessContract: "legacy",
  guideBox,
  disableRoiSegmentation: true,
}), guideBox);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm run test:unit -w frontend -- --test-name-pattern="MobileNet guide box"
```

Expected: FAIL because the resolver and the new analysis option do not exist.

- [ ] **Step 3: Implement option propagation and MobileNet resolution**

Extend `AnalyzeOptions` and the MobileNet classifier options with:

```ts
disableRoiSegmentation?: boolean;
```

In `useInspectionWorkspace.handleAnalyze`, call:

```ts
await analyzeOffline(capturedInput.file, DEFAULT_MEAT_TYPE, {
  guideBox: capturedInput.guideBox,
  disableRoiSegmentation: developerFlags.disableRoiSegmentation,
});
```

Keep `runActiveAnalysis` forwarding the full options object to both classifiers. In `classifyWithMobileNetV3`, resolve the guide box using the active preprocess contract before `buildCroppedImageData`. When the flag is enabled for `segmented_center_roi`, pass `null`; otherwise preserve the current guide box. `analyzeOffline` must pass the flag into `runActiveAnalysis` instead of dropping it. ResNet continues receiving its existing guide-box behavior.

- [ ] **Step 4: Run focused analysis tests and typecheck**

Run:

```bash
npm run test:unit -w frontend -- --test-name-pattern="MobileNet guide box"
npm run typecheck -w frontend
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 5: Commit the inference path**

```bash
git add frontend/src/features/offline-analysis frontend/src/widgets/inspection-workspace/model/use-inspection-workspace.ts frontend/tests/unit/features/offline-analysis/analysis-input-mode.unit.test.ts
git commit -m "feat: apply gray ROI toggle to MobileNet analysis"
```

### Task 4: Verify end-to-end behavior and integration safety

**Files:**
- Modify: `frontend/tests/e2e/journeys/developer/developer-options.e2e.spec.ts` if additional default assertions are needed
- Modify: `frontend/tests/e2e/journeys/inspector/camera-capture.e2e.spec.ts` only if a stable preview fixture can verify the toggle without a flaky pixel assertion

**Interfaces:**
- Consumes: the completed flag, preview, and analysis paths from Tasks 1–3.
- Produces: verified developer-facing behavior with no regression to locked access, checklist behavior, model selection, or existing camera flows.

- [ ] **Step 1: Run focused frontend unit/component suites**

Run:

```bash
npm run test:unit -w frontend
npm run test:component -w frontend
```

Expected: PASS.

- [ ] **Step 2: Run developer and camera E2E coverage**

Run:

```bash
npx playwright test frontend/tests/e2e/journeys/developer/developer-options.e2e.spec.ts frontend/tests/e2e/journeys/inspector/camera-capture.e2e.spec.ts
```

Expected: PASS. If camera fixtures cannot reliably inspect pixel output, keep deterministic policy tests and verify the toggle label/storage behavior in E2E instead of adding a flaky screenshot assertion.

- [ ] **Step 3: Run lint, typecheck, and architecture checks**

Run:

```bash
npm run lint -w frontend
npm run typecheck -w frontend
npm run test:architecture -w frontend
```

Expected: PASS with no new warnings or boundary violations.

- [ ] **Step 4: Review the final diff and working tree**

Run:

```bash
git diff --check
git status --short
git log -5 --oneline
```

Confirm that only intended developer-option, capture, analysis, and test files changed and that no generated model or build artifacts are included.

- [ ] **Step 5: Commit final verification adjustments, if any**

```bash
git add frontend/src frontend/tests
git commit -m "test: verify developer preprocessing options"
```

Only create this final commit if Task 4 required a source/test adjustment after review; do not create an empty commit.
