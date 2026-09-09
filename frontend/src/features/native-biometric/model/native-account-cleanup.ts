export async function clearNativeBiometricOnAccountSwitch(
  currentUserId: string | null,
  nextUserId: string,
  clearRecord: () => Promise<void>,
): Promise<boolean> {
  if (!currentUserId || currentUserId === nextUserId) {
    return false;
  }

  await clearRecord();
  return true;
}
