export const AUTH_EXPIRED_EVENT = "meatlens:auth-expired";

let apiCsrfToken: string | null = null;

function isSafeMethod(method: string | undefined): boolean {
  const normalizedMethod = (method ?? "GET").toUpperCase();
  return normalizedMethod === "GET" || normalizedMethod === "HEAD" || normalizedMethod === "OPTIONS";
}

export function getApiCsrfToken(): string | null {
  return apiCsrfToken;
}

export function setApiCsrfToken(token: string | null): void {
  apiCsrfToken = token?.trim() || null;
}

export function clearApiCsrfToken(): void {
  apiCsrfToken = null;
}

export function notifyApiAuthExpired(): void {
  clearApiCsrfToken();
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
}

export function applyApiRequestInit(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers);

  if (!isSafeMethod(init.method) && apiCsrfToken && !headers.has("X-CSRF-Token")) {
    headers.set("X-CSRF-Token", apiCsrfToken);
  }

  return {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  };
}
