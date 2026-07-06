const RECOVERY_ACCESS_TOKEN_STORAGE_KEY = "meatlens-recovery-access-token";

function parseHashParams(hash: string): URLSearchParams {
  const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(normalizedHash);
}

function stripHashFromCurrentUrl(): void {
  const sanitizedUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(window.history.state, document.title, sanitizedUrl);
}

export function scrubSensitiveAuthHashFromUrl(): void {
  if (typeof window === "undefined") return;

  const hashParams = parseHashParams(window.location.hash);
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (!accessToken && !refreshToken) {
    return;
  }

  const authType = hashParams.get("type");
  if (authType === "recovery" && accessToken) {
    try {
      window.sessionStorage.setItem(RECOVERY_ACCESS_TOKEN_STORAGE_KEY, accessToken);
    } catch {
      // Best-effort: still remove sensitive tokens from URL even if storage fails.
    }
  }

  stripHashFromCurrentUrl();
}

export function getStoredRecoveryAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage.getItem(RECOVERY_ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearStoredRecoveryAccessToken(): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(RECOVERY_ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    // Best-effort cleanup only.
  }
}
