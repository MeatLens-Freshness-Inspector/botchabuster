import type { SquareGuideBox } from "./meat-lens-pipeline";
import type { ModelPreprocessContract } from "./mobilenet-session";

export interface MobileNetGuideBoxOptions {
  preprocessContract: ModelPreprocessContract;
  guideBox: SquareGuideBox | null;
  disableRoiSegmentation: boolean;
}

export function resolveMobileNetGuideBox({
  preprocessContract,
  guideBox,
  disableRoiSegmentation,
}: MobileNetGuideBoxOptions): SquareGuideBox | null {
  if (preprocessContract === "segmented_center_roi" && disableRoiSegmentation) {
    return null;
  }

  return guideBox;
}
