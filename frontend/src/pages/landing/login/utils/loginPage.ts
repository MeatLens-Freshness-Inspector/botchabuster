export function getLoginDescription(showOfflinePasskeyUnlock: boolean): string {
  return showOfflinePasskeyUnlock
    ? "Unlock your cached MeatLens session on this device"
    : "Access your MeatLens account";
}

export function getAuthDestination(isAdmin: boolean): string {
  return isAdmin ? "/admin" : "/inspect";
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
