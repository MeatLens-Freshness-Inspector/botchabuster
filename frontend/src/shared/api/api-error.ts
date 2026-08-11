export interface HttpApiError extends Error {
  status: number;
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
    const payload = (await response.json()) as { error?: unknown; message?: unknown };
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
