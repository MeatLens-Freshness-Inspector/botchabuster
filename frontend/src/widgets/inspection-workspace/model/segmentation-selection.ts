import { DEFAULT_DISABLE_ROI_SEGMENTATION } from "@/features/offline-analysis";

export function resolveInspectionSegmentationDisabled(
  isDeveloper: boolean,
  isDeveloperUnlocked: boolean,
  storedValue: boolean,
): boolean {
  if (!isDeveloper || !isDeveloperUnlocked) return DEFAULT_DISABLE_ROI_SEGMENTATION;
  return storedValue;
}
