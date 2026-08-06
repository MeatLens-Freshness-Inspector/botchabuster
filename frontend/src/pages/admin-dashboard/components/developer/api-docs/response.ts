export type ApiDocsResponseBodyKind = "json" | "text" | "blob" | "empty";

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
  binaryBody: Blob | null;
  fileName: string | null;
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

function getFileName(headers: Record<string, string>): string | null {
  const disposition = headers["content-disposition"] ?? "";
  const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^;"]+)/i);
  return match?.[1]?.trim() || null;
}

export async function readApiDocsResponse(
  response: Response,
  elapsedMs: number,
): Promise<ApiDocsResponse> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, name) => {
    headers[name.toLowerCase()] = value;
  });

  const contentType = headers["content-type"] ?? "";
  const isBinary = /application\/(?:zip|octet-stream|pdf)|^image\//i.test(contentType);
  if (isBinary) {
    const buffer = await response.arrayBuffer();
    const sizeBytes = buffer.byteLength;
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      elapsedMs,
      sizeBytes,
      headers,
      bodyKind: sizeBytes ? "blob" : "empty",
      displayBody: sizeBytes ? `Binary response (${sizeBytes} bytes)` : "",
      errorMessage: response.ok ? null : readErrorMessage(null, response),
      binaryBody: sizeBytes ? new Blob([buffer], { type: contentType || "application/octet-stream" }) : null,
      fileName: getFileName(headers),
    };
  }

  const rawBody = await response.text();

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
      binaryBody: null,
      fileName: null,
    };
  }

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
        binaryBody: null,
        fileName: null,
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
    binaryBody: null,
    fileName: null,
  };
}
