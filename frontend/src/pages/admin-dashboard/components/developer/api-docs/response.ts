export type ApiDocsResponseBodyKind = "json" | "text" | "empty";

export interface ApiDocsResponse {
  ok: boolean;
  status: number;
  statusText: string;
  elapsedMs: number;
  sizeBytes: number;
  headers: Record<string, string>;
  bodyKind: ApiDocsResponseBodyKind;
  displayBody: string;
  errorMessage: string | null;
}

export function getApiDocsResponseSize(body: string): number {
  return body ? new TextEncoder().encode(body).byteLength : 0;
}

function readErrorMessage(body: unknown, response: Response): string {
  if (typeof body === "object" && body !== null && !Array.isArray(body)) {
    const record = body as Record<string, unknown>;
    if (typeof record.error === "string" && record.error.trim()) return record.error.trim();
    if (typeof record.message === "string" && record.message.trim()) return record.message.trim();
  }

  return response.statusText?.trim() || `HTTP ${response.status}`;
}

export async function readApiDocsResponse(
  response: Response,
  elapsedMs: number,
): Promise<ApiDocsResponse> {
  const rawBody = await response.text();
  const headers: Record<string, string> = {};
  response.headers.forEach((value, name) => {
    headers[name.toLowerCase()] = value;
  });

  const trimmedBody = rawBody.trim();
  if (!trimmedBody) {
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      elapsedMs,
      sizeBytes: 0,
      headers,
      bodyKind: "empty",
      displayBody: "",
      errorMessage: response.ok ? null : readErrorMessage(null, response),
    };
  }

  const contentType = headers["content-type"] ?? "";
  const shouldParseJson = contentType.includes("json") || trimmedBody.startsWith("{") || trimmedBody.startsWith("[");

  if (shouldParseJson) {
    try {
      const parsedBody: unknown = JSON.parse(rawBody);
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        elapsedMs,
        sizeBytes: getApiDocsResponseSize(rawBody),
        headers,
        bodyKind: "json",
        displayBody: JSON.stringify(parsedBody, null, 2),
        errorMessage: response.ok ? null : readErrorMessage(parsedBody, response),
      };
    } catch {
      // A mislabeled JSON response is still useful as raw text.
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    elapsedMs,
    sizeBytes: getApiDocsResponseSize(rawBody),
    headers,
    bodyKind: "text",
    displayBody: rawBody,
    errorMessage: response.ok ? null : readErrorMessage(rawBody, response),
  };
}
