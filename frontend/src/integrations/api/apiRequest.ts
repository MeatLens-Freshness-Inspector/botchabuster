export const AUTH_EXPIRED_EVENT = "meatlens:auth-expired";

let apiCsrfToken: string | null = null;

export interface HttpApiError extends Error {
  status: number;
}

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

export function createHttpApiError(message: string, status: number): HttpApiError {
  const error = new Error(message) as HttpApiError;
  error.status = status;
  return error;
}

export function getHttpApiErrorStatus(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }

  return null;
}

export async function readApiErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json() as { error?: unknown; message?: unknown };
    if (typeof payload.error === "string" && payload.error.trim().length > 0) {
      return payload.error.trim();
    }

    if (typeof payload.message === "string" && payload.message.trim().length > 0) {
      return payload.message.trim();
    }
  } catch {
    // Ignore JSON parse errors and use fallback details below.
  }

  if (response.statusText && response.statusText.trim().length > 0) {
    return response.statusText.trim();
  }

  return fallback;
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
