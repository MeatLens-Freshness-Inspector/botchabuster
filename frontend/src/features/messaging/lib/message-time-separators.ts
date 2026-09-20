export const MESSAGE_TIME_SEPARATOR_THRESHOLD_MS = 30 * 60 * 1000;

export function shouldRenderMessageTimeSeparator(
  previousCreatedAt: string | null,
  currentCreatedAt: string,
): boolean {
  if (!previousCreatedAt) return true;

  const previousTime = new Date(previousCreatedAt).getTime();
  const currentTime = new Date(currentCreatedAt).getTime();

  if (Number.isNaN(previousTime) || Number.isNaN(currentTime)) return false;

  return currentTime - previousTime >= MESSAGE_TIME_SEPARATOR_THRESHOLD_MS;
}
