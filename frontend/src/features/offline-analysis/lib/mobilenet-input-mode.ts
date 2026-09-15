import type { SquareGuideBox } from "./meat-lens-pipeline";
import type { ModelPreprocessContract } from "./mobilenet-session";
import { applyRoiSegmentationWithFallback } from "./roi-segmentation";
import { DEFAULT_DISABLE_ROI_SEGMENTATION } from "./preprocessing-defaults";

export interface MobileNetGuideBoxOptions {
  preprocessContract: ModelPreprocessContract;
  guideBox: SquareGuideBox | null;
  disableRoiSegmentation?: boolean;
}

export function resolveMobileNetGuideBox({
  preprocessContract,
  guideBox,
  disableRoiSegmentation,
}: MobileNetGuideBoxOptions): SquareGuideBox | null {
  void disableRoiSegmentation;
  if (preprocessContract === "segmented_center_roi") return null;

  return guideBox;
}

export interface MobileNetImagePreparationOptions {
  preprocessContract: ModelPreprocessContract;
  disableRoiSegmentation?: boolean;
}

export function prepareMobileNetInputImageData(
  imageData: ImageData,
  options: MobileNetImagePreparationOptions,
): { imageData: ImageData; segmentationApplied: boolean } {
  const segmentationDisabled = options.disableRoiSegmentation ?? DEFAULT_DISABLE_ROI_SEGMENTATION;
  if (options.preprocessContract !== "segmented_center_roi" || segmentationDisabled) {
    return { imageData, segmentationApplied: false };
  }

  const result = applyRoiSegmentationWithFallback(imageData);
  return {
    imageData: result.imageData,
    segmentationApplied: result.segmented,
  };
}
