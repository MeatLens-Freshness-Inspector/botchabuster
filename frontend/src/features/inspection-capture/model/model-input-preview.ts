import {
  DEFAULT_DISABLE_ROI_SEGMENTATION,
  type ModelInputPreparationOptions,
  type SquareGuideBox,
} from "@/features/offline-analysis";

export type PreviewPreprocessContract = "legacy" | "segmented_center_roi";

export interface ModelInputPreviewOptions {
  preprocessContract: PreviewPreprocessContract;
  guideBox: SquareGuideBox | null;
  disableRoiSegmentation?: boolean;
}

export type ResolvedModelInputPreviewOptions = Pick<
  ModelInputPreparationOptions,
  "guideBox" | "forceCenterCrop" | "applySegmentation"
>;

export function resolveModelInputPreviewOptions({
  preprocessContract,
  guideBox,
  disableRoiSegmentation,
}: ModelInputPreviewOptions): ResolvedModelInputPreviewOptions {
  const isSegmentedCenterRoi = preprocessContract === "segmented_center_roi";
  const segmentationDisabled = disableRoiSegmentation ?? DEFAULT_DISABLE_ROI_SEGMENTATION;

  return {
    guideBox: isSegmentedCenterRoi ? null : guideBox,
    forceCenterCrop: isSegmentedCenterRoi,
    applySegmentation: isSegmentedCenterRoi && !segmentationDisabled,
  };
}
