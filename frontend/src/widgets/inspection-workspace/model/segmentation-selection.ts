export function resolveInspectionSegmentationDisabled(
  isDeveloper: boolean,
  isDeveloperUnlocked: boolean,
  storedValue: boolean,
): boolean {
  if (!isDeveloper || !isDeveloperUnlocked) return true;
  return storedValue;
}
