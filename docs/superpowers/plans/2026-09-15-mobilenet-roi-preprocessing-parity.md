# MobileNet ROI Preprocessing Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the active MobileNetV3 inference path use the same HSV/LAB ROI segmentation strength and 224x224 center-crop contract as `meatlens-training-1` and `meatlens-training-2`.

**Architecture:** Keep preprocessing in the existing browser-side ROI utilities. Upgrade the mask morphology and component selection to match the training reference, expose one small MobileNet input-preparation boundary that both inference and tests can exercise, and change the segmented model default to enabled while preserving the explicit diagnostic disable flag and safe unsegmented fallback.

**Tech Stack:** TypeScript, browser `ImageData`, Node `node:test`, `tsx`, Vite, ONNX Runtime Web.

## Global Constraints

- Preserve existing unrelated worktree changes; stage only files belonging to this task.
- Do not change the ONNX model, labels, ResNet behavior, or probability calibration.
- Keep segmentation dependency-free in the browser.
- Match the training reference thresholds: HSV `S >= 20`, `V >= 35`, reject `V >= 235 && S <= 30`, and LAB `a >= 6`.
- Match the training reference quality gates: mask area ratio `[0.20, 0.95]`, central overlap `>= 0.08`, component area `>= 200`, and gray RGB background `127`.
- Every production change must have a failing test observed first, then a passing focused test, followed by the relevant CI-equivalent checks.

---

### Task 1: Match training morphology and central-component selection

**Files:**
- Modify: `frontend/src/features/offline-analysis/lib/mask-morphology.ts`
- Test: `frontend/tests/unit/features/offline-analysis/mask-morphology.unit.test.ts`

**Interfaces:**
- Consumes: binary `Uint8Array` masks at the 224x224 model-input resolution.
- Produces: deterministic disk-radius morphology and component-selection metrics used by `roi-segmentation.ts`.

- [ ] **Step 1: Write failing morphology tests**

Extend the existing unit test with cases that require the training-sized structuring elements and central selection behavior:

```ts
test("uses training-sized morphology to remove small noise while retaining a central region", () => {
  const source = new Uint8Array(31 * 31);
  for (let y = 10; y <= 20; y += 1) {
    for (let x = 10; x <= 20; x += 1) source[y * 31 + x] = 1;
  }
  source[2 * 31 + 2] = 1;

  const cleaned = cleanMaskWithMorphology(source, 31, 31);

  assert.equal(cleaned[15 * 31 + 15], 1);
  assert.equal(cleaned[2 * 31 + 2], 0);
});

test("selects the largest central component using training quality metrics", () => {
  const source = new Uint8Array(20 * 20);
  for (let y = 6; y <= 13; y += 1) {
    for (let x = 6; x <= 13; x += 1) source[y * 20 + x] = 1;
  }
  for (let y = 1; y <= 3; y += 1) {
    for (let x = 1; x <= 3; x += 1) source[y * 20 + x] = 1;
  }

  const result = selectBestCentralComponent(source, 20, 20);

  assert.ok(result);
  assert.equal(result.mask[9 * 20 + 9], 1);
  assert.equal(result.mask[1 * 20 + 1], 0);
  assert.equal(result.numberOfComponents, 2);
  assert.ok(result.centerOverlapRatio >= 0.08);
});
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run:

```powershell
npx tsx --test frontend/tests/unit/features/offline-analysis/mask-morphology.unit.test.ts
```

Expected: FAIL because the current implementation uses 3x3 morphology, a `0.015` component threshold, and returns only a mask instead of training quality metrics.

- [ ] **Step 3: Implement training-parity morphology**

Replace the fixed 3x3 operations with deterministic disk offsets and update `selectBestCentralComponent` to return:

```ts
export interface CentralComponentSelection {
  mask: Uint8Array;
  areaRatio: number;
  centerOverlapRatio: number;
  numberOfComponents: number;
  touchesBorder: boolean;
}

export function cleanMaskWithMorphology(
  mask: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const opened = dilateMask(erodeMask(mask, width, height, 3), width, height, 3);
  const closed = erodeMask(dilateMask(opened, width, height, 5), width, height, 5);
  return fillMaskHoles(removeSmallMaskObjects(closed, width, height, 250), width, height);
}
```

The implementation must use integer disk offsets satisfying `dx * dx + dy * dy <= radius * radius`, 4-connected component traversal, a central region spanning 25%–75% of both axes, and the training score:

```ts
score = 2 * areaRatio + 2.5 * centerOverlapRatio - 1.25 * distanceNorm;
```

Filter components below 200 pixels before selecting the highest score, then return the selected component’s area ratio, central overlap, component count, and border-touch state.

- [ ] **Step 4: Run morphology tests and confirm green**

Run `npx tsx --test frontend/tests/unit/features/offline-analysis/mask-morphology.unit.test.ts`. Expected: all tests in `mask-morphology.unit.test.ts` pass.

- [ ] **Step 5: Commit the isolated morphology change**

```powershell
git add -- frontend/src/features/offline-analysis/lib/mask-morphology.ts frontend/tests/unit/features/offline-analysis/mask-morphology.unit.test.ts
git commit -m "fix: match ROI morphology to training pipeline"
```

### Task 2: Match HSV/LAB thresholds and mask-quality fallback

**Files:**
- Modify: `frontend/src/features/offline-analysis/lib/roi-segmentation.ts`
- Test: `frontend/tests/unit/features/offline-analysis/roi-segmentation.unit.test.ts`

**Interfaces:**
- Consumes: 224x224 RGB `ImageData` from the center-crop/resizer.
- Produces: `{ imageData, segmented }`, with gray RGB 127 outside the selected ROI and the original image on failure.

- [ ] **Step 1: Add failing segmentation tests**

Create a small `ImageData` test shim and test the training thresholds, gray fill, and fallback:

```ts
test("segments the training-compatible foreground and fills background gray", () => {
  const input = makeImageData(32, 32, (x, y) =>
    x >= 8 && x < 24 && y >= 8 && y < 24 ? [170, 70, 65] : [255, 255, 255],
  );

  const result = applyRoiSegmentationWithFallback(input);

  assert.equal(result.segmented, true);
  assert.deepEqual(rgbAt(result.imageData, 0, 0), [127, 127, 127]);
  assert.deepEqual(rgbAt(result.imageData, 16, 16), [170, 70, 65]);
});

test("falls back to the original crop when no valid ROI is found", () => {
  const input = makeImageData(32, 32, () => [255, 255, 255]);

  const result = applyRoiSegmentationWithFallback(input);

  assert.equal(result.segmented, false);
  assert.deepEqual(Array.from(result.imageData.data), Array.from(input.data));
});

test("rejects high-value low-saturation white pixels as foreground", () => {
  const input = makeImageData(32, 32, () => [248, 248, 248]);

  const result = applyRoiSegmentationWithFallback(input);

  assert.equal(result.segmented, false);
});
```

The helper must install and restore a local `ImageData` shim because the Node test environment does not provide the browser constructor.

- [ ] **Step 2: Run the focused test and verify it fails for the current implementation**

Run:

```powershell
npx tsx --test frontend/tests/unit/features/offline-analysis/roi-segmentation.unit.test.ts
```

Expected: FAIL because the current foreground predicate is more permissive than the training predicate and the current component selection lacks the training area/overlap failure gates.

- [ ] **Step 3: Implement the exact threshold and quality behavior**

Update `isLikelyMeatForeground` to use normalized equivalents of the training byte thresholds:

```ts
const saturation = hsv.s * 255;
const value = hsv.v * 255;
return (
  saturation >= 20 &&
  value >= 35 &&
  !(value >= 235 && saturation <= 30) &&
  lab.a >= 6
);
```

Use the metrics from Task 1 and return `segmented: false` with the unchanged source when:

```ts
maskAreaRatio < 0.20 ||
maskAreaRatio > 0.95 ||
centerOverlapRatio < 0.08
```

Otherwise create a new `ImageData` with the selected pixels unchanged, all other RGB channels set to 127, and alpha set to 255.

- [ ] **Step 4: Run segmentation tests and confirm green**

Run the same focused command. Expected: all segmentation tests pass.

- [ ] **Step 5: Commit the segmentation parity change**

```powershell
git add -- frontend/src/features/offline-analysis/lib/roi-segmentation.ts frontend/tests/unit/features/offline-analysis/roi-segmentation.unit.test.ts
git commit -m "fix: align ROI segmentation thresholds with training"
```

### Task 3: Integrate segmentation into actual MobileNet inference

**Files:**
- Modify: `frontend/src/features/offline-analysis/lib/preprocessing-defaults.ts`
- Modify: `frontend/src/features/offline-analysis/lib/mobilenet-input-mode.ts`
- Modify: `frontend/src/features/offline-analysis/lib/mobilenet-runtime.ts`
- Test: `frontend/tests/unit/features/offline-analysis/analysis-input-mode.unit.test.ts`
- Test: `frontend/tests/unit/features/offline-analysis/analysis-runtime.unit.test.ts`

**Interfaces:**
- Consumes: cropped/resized `ImageData`, MobileNet preprocess contract, and optional `disableRoiSegmentation` override.
- Produces: a segmented `ImageData` for `segmented_center_roi` models by default; an unchanged image for legacy models or explicit disable.

- [ ] **Step 1: Write the failing default and input-preparation regression tests**

Change the existing default expectations from disabled to enabled and add a test for the shared preparation boundary:

```ts
test("segmented MobileNet input is prepared with ROI preprocessing by default", () => {
  const input = makeImageData(32, 32, (x, y) =>
    x >= 8 && x < 24 && y >= 8 && y < 24 ? [170, 70, 65] : [255, 255, 255],
  );

  const result = prepareMobileNetInputImageData(input, {
    preprocessContract: "segmented_center_roi",
  });

  assert.equal(result.segmentationApplied, true);
  assert.deepEqual(rgbAt(result.imageData, 0, 0), [127, 127, 127]);
});

test("explicitly disabled ROI preprocessing keeps the original crop", () => {
  const input = makeImageData(32, 32, () => [170, 70, 65]);

  const result = prepareMobileNetInputImageData(input, {
    preprocessContract: "segmented_center_roi",
    disableRoiSegmentation: true,
  });

  assert.equal(result.segmentationApplied, false);
  assert.deepEqual(Array.from(result.imageData.data), Array.from(input.data));
});
```

- [ ] **Step 2: Run the focused tests and verify the expected failure**

Run:

```powershell
npx tsx --test frontend/tests/unit/features/offline-analysis/analysis-input-mode.unit.test.ts frontend/tests/unit/features/offline-analysis/analysis-runtime.unit.test.ts
```

Expected: FAIL because the default is currently `true` for disabling segmentation and inference does not transform its cropped `ImageData`.

- [ ] **Step 3: Implement the minimal integration**

Set `DEFAULT_DISABLE_ROI_SEGMENTATION` to `false`. Add a shared helper with this behavior:

```ts
export function prepareMobileNetInputImageData(
  imageData: ImageData,
  options: {
    preprocessContract: ModelPreprocessContract;
    disableRoiSegmentation?: boolean;
  },
): { imageData: ImageData; segmentationApplied: boolean } {
  const disabled = options.disableRoiSegmentation ?? DEFAULT_DISABLE_ROI_SEGMENTATION;
  if (options.preprocessContract !== "segmented_center_roi" || disabled) {
    return { imageData, segmentationApplied: false };
  }
  return applyRoiSegmentationWithFallback(imageData);
}
```

In `classifyWithMobileNetV3`, replace the immutable crop variable with a prepared result:

```ts
const croppedImageData = buildCroppedImageData(image, targetWidth, targetHeight, guideBox);
const preparedImageData = prepareMobileNetInputImageData(croppedImageData, {
  preprocessContract: profile.preprocessContract,
  disableRoiSegmentation: options.disableRoiSegmentation,
});
const tensorData = buildImageTensorData(
  preparedImageData.imageData,
  layout.channelsFirst,
  preprocessMode,
);
```

Keep the legacy model path unchanged and keep the explicit disable option available for diagnostics.

- [ ] **Step 4: Run the focused regression tests and confirm green**

Run the same focused command. Expected: all input-mode and runtime tests pass, including the new default-enabled and explicit-disable cases.

- [ ] **Step 5: Commit the inference integration**

```powershell
git add -- frontend/src/features/offline-analysis/lib/preprocessing-defaults.ts frontend/src/features/offline-analysis/lib/mobilenet-input-mode.ts frontend/src/features/offline-analysis/lib/mobilenet-runtime.ts frontend/tests/unit/features/offline-analysis/analysis-input-mode.unit.test.ts frontend/tests/unit/features/offline-analysis/analysis-runtime.unit.test.ts
git commit -m "fix: apply ROI preprocessing during MobileNet inference"
```

### Task 4: Update preview expectations and run the complete affected verification gate

**Files:**
- Modify: `frontend/tests/unit/features/inspection-capture/model-input-preview.unit.test.ts`

**Interfaces:**
- Consumes: the shared default segmentation setting.
- Produces: preview options consistent with actual MobileNet inference.

- [ ] **Step 1: Update the existing preview test expectations**

Change the default segmented-preview expectation to:

```ts
assert.deepEqual(resolveModelInputPreviewOptions({
  preprocessContract: "segmented_center_roi",
  guideBox: { x: 0.1, y: 0.1, size: 0.8 },
}), {
  guideBox: null,
  forceCenterCrop: true,
  applySegmentation: true,
});
```

Keep the explicit `disableRoiSegmentation: true` test expecting `applySegmentation: false`.

- [ ] **Step 2: Run the focused frontend unit suite**

```powershell
npx tsx --test frontend/tests/unit/features/offline-analysis/analysis-input-mode.unit.test.ts frontend/tests/unit/features/offline-analysis/analysis-runtime.unit.test.ts frontend/tests/unit/features/offline-analysis/mask-morphology.unit.test.ts frontend/tests/unit/features/offline-analysis/roi-segmentation.unit.test.ts frontend/tests/unit/features/inspection-capture/model-input-preview.unit.test.ts frontend/tests/unit/features/offline-analysis/model-catalog.unit.test.ts frontend/tests/unit/features/developer-tools/developer-options-storage.unit.test.ts
```

Expected: zero failures.

- [ ] **Step 3: Run the frontend lint and typecheck gates**

```powershell
npm run lint -w frontend
npm run typecheck -w frontend
```

Expected: both exit with code 0.

- [ ] **Step 4: Run frontend component and integration checks**

```powershell
npm run test:component -w frontend
npm run test:integration -w frontend
```

Expected: both suites exit with code 0.

- [ ] **Step 5: Run the Netlify preflight and production build**

```powershell
node scripts/check-netlify-preflight.mjs
npm run build
```

Expected: preflight exits 0 and Vite produces the production bundle with the updated model-input path.

- [ ] **Step 6: Inspect the final diff and worktree scope**

```powershell
git diff --check HEAD~3..HEAD
git status --short --branch
git log -4 --oneline
```

Verify that only the ROI parity commits and their files belong to this task, while the pre-existing unrelated dirty files remain present and unmodified by this work.
