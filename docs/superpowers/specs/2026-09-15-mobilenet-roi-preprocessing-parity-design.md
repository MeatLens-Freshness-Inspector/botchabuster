# MobileNet ROI Preprocessing Parity Design

## Goal

Make the deployed MobileNetV3 inspection path consume the same 224x224 HSV/LAB-thresholded ROI representation used by `meatlens-training-1` and `meatlens-training-2`, preventing the model from receiving raw center crops that collapse to `spoiled`.

## Context and confirmed cause

The active `model3` metadata declares `processed_hsv_lab_threshold_roi_224` as its image crop/input mode. The training repositories create this input by center-square cropping and resizing to 224x224, building an HSV/LAB foreground mask, cleaning the mask, selecting the strongest central component, and filling non-ROI pixels with RGB 127 gray. The frontend currently defaults ROI segmentation off, and the actual ONNX inference path only center-crops and resizes the source image. Its existing segmentation helper is used by the capture preview but not by inference, and its thresholds/morphology do not match the training implementation.

## Design

### 1. Shared segmentation behavior

Update the frontend segmentation implementation to match the training reference:

- Convert RGB pixels to HSV and LAB using the existing browser-side converters.
- Mark foreground when `S >= 20`, `V >= 35`, the pixel is not high-value/low-saturation white background (`V >= 235` and `S <= 30`), and LAB `a >= 6`.
- Apply disk-radius-3 opening and disk-radius-5 closing, fill holes, remove objects below the training minimum, and select the best central component using the training score and central-overlap calculation.
- Treat the segmentation as failed when no component exists, the selected mask area is below `0.20`, above `0.95`, or its central overlap is below `0.08`.
- On failure, preserve the original 224x224 center-cropped image as the explicit fallback, matching the training script's behavior.
- Fill pixels outside the selected mask with RGB 127 and preserve RGB 255 alpha.

The implementation will remain dependency-free in the browser. Where the training implementation uses `scikit-image`, equivalent deterministic disk-based morphology and connected-component logic will be implemented in the existing TypeScript utilities.

### 2. Inference integration

For `segmented_center_roi` MobileNet profiles, enable segmentation by default and run the shared segmentation function on the already center-cropped/resized `ImageData` before tensor conversion. Legacy MobileNet profiles keep their current unsegmented behavior, and an explicit `disableRoiSegmentation: true` option continues to provide an unsegmented diagnostic path.

The capture preview and ONNX inference will use the same segmentation function and default, so the displayed model input represents the tensor that is actually classified.

### 3. Tests and verification

Add regression coverage for:

- The segmented model default enabling ROI preprocessing.
- The exact HSV/LAB foreground thresholds and white-background rejection.
- Morphology/component quality behavior and gray-background output on a synthetic image.
- Fallback to the original crop when no valid foreground component exists.
- Actual MobileNet input preparation applying segmentation by default while honoring the explicit disable option.

Run the focused frontend unit tests first, followed by frontend lint, typecheck, the relevant full frontend unit/component/integration checks, Netlify preflight, and the production build.

## Non-goals

- Retraining or modifying the ONNX model.
- Changing model labels or probability calibration.
- Changing the legacy ResNet preprocessing path.
- Removing the explicit diagnostic option that disables segmentation.

## Success criteria

1. The active MobileNet model receives a gray-background ROI image by default when a valid ROI is present.
2. The browser segmentation decisions use the same thresholds and quality gates as the training repositories.
3. Segmentation failure falls back safely to the center crop without crashing analysis.
4. Regression tests fail before the implementation change and pass afterward.
5. The affected frontend CI-equivalent checks pass with no unrelated worktree changes.
