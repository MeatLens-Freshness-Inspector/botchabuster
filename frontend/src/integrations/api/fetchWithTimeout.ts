export const API_REQUEST_TIMEOUT_MESSAGE = "Request timed out. Please check your connection and try again.";
export const DEFAULT_API_REQUEST_TIMEOUT_MS = 15_000;
export const UPLOAD_REQUEST_TIMEOUT_MS = 30_000;

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export async function fetchWithTimeout(
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
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (didTimeout && isAbortError(error)) {
      throw new Error(API_REQUEST_TIMEOUT_MESSAGE);
    }

    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
    if (sourceSignal) {
      sourceSignal.removeEventListener("abort", handleSourceAbort);
    }
  }
}
