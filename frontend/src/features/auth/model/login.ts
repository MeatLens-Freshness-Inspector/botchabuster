export function getLoginDescription(showOfflinePasskeyUnlock: boolean): string {
  return showOfflinePasskeyUnlock
    ? "Unlock your cached MeatLens session on this device"
    : "Access your MeatLens account";
}

export function getNativeBiometricLoginLabel(isOffline: boolean): string {
  return isOffline ? "Unlock with Device Biometrics" : "Sign In with Device Biometrics";
}

export function getNativeBiometricLoginState(input: {
  available: boolean;
  offline: boolean;
}): { visible: boolean; label: string } {
  return {
    visible: input.available,
    label: getNativeBiometricLoginLabel(input.offline),
  };
}

export function getAuthDestination(isAdmin: boolean): string {
  return isAdmin ? "/admin" : "/inspect";
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
