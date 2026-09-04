import { applyApiRequestInit, refreshApiSessionForCsrf } from "./request";
import {
  recordApiTransportFailure,
  recordApiTransportResponseFailure,
} from "./api-transport-diagnostics";

export const API_REQUEST_TIMEOUT_MESSAGE = "Request timed out. Please check your connection and try again.";
export const DEFAULT_API_REQUEST_TIMEOUT_MS = 15_000;
export const UPLOAD_REQUEST_TIMEOUT_MS = 30_000;

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

async function fetchOnceWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_API_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const sourceSignal = init.signal;
  let didTimeout = false;

  const handleSourceAbort = () => controller.abort();
  if (sourceSignal) {
    if (sourceSignal.aborted) {
      controller.abort();
    } else {
      sourceSignal.addEventListener("abort", handleSourceAbort, { once: true });
    }
  }

  const timeoutId = globalThis.setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  try {
    const nextInit = applyApiRequestInit(init);
    const response = await fetch(input, {
      ...nextInit,
      signal: controller.signal,
    });

    if (!response.ok) {
      recordApiTransportResponseFailure({
        input,
        init: nextInit,
        response,
      });
    }

    return response;
  } catch (error) {
    let requestError = error;
    if (didTimeout && isAbortError(error)) {
      requestError = new Error(API_REQUEST_TIMEOUT_MESSAGE);
    }

    recordApiTransportFailure({
      input,
      init,
      error: requestError,
    });

    throw requestError;
  } finally {
    globalThis.clearTimeout(timeoutId);
    if (sourceSignal) {
      sourceSignal.removeEventListener("abort", handleSourceAbort);
    }
  }
}

async function isInvalidCsrfResponse(response: Response): Promise<boolean> {
  if (response.status !== 403) {
    return false;
  }

  try {
    const payload = (await response.clone().json()) as { error?: unknown };
    return payload.error === "Invalid CSRF token";
  } catch {
    return false;
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_API_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const response = await fetchOnceWithTimeout(input, init, timeoutMs);

  if (!(await isInvalidCsrfResponse(response))) {
    return response;
  }

  const refreshedToken = await refreshApiSessionForCsrf();
  if (!refreshedToken) {
    return response;
  }

  const retryHeaders = new Headers(init.headers);
  retryHeaders.set("X-CSRF-Token", refreshedToken);

  return fetchOnceWithTimeout(input, {
    ...init,
    headers: retryHeaders,
  }, timeoutMs);
}
