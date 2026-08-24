import type { SquareGuideBox } from "./meat-lens-pipeline";
import type { ModelPreprocessContract } from "./mobilenet-session";
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
  const segmentationDisabled = disableRoiSegmentation ?? DEFAULT_DISABLE_ROI_SEGMENTATION;
  if (preprocessContract === "segmented_center_roi" && segmentationDisabled) {
    return null;
  }

  return guideBox;
}
