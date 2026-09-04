import { Capacitor } from "@capacitor/core";

export const API_TRANSPORT_DIAGNOSTICS_STORAGE_KEY = "meatlens-api-transport-diagnostics";
export const MAX_API_TRANSPORT_DIAGNOSTICS = 25;

export type ApiTransportDiagnosticStage = "network-error" | "http-error";

export interface ApiTransportDiagnostic {
  timestamp: string;
  stage: ApiTransportDiagnosticStage;
  method: string;
  url: string;
  appOrigin: string;
  platform: string;
  online: boolean | null;
  status?: number;
  statusText?: string;
  errorName?: string;
  errorMessage?: string;
}

interface RecordApiTransportFailureOptions {
  input: RequestInfo | URL;
  init?: RequestInit;
  error: unknown;
}

interface RecordApiTransportResponseFailureOptions {
  input: RequestInfo | URL;
  init?: RequestInit;
  response: Response;
}

function getAppOrigin(): string {
  if (typeof window === "undefined") {
    return "unknown";
  }

  return window.location.origin;
}

function getInputUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

function sanitizeUrl(input: RequestInfo | URL): string {
  const appOrigin = getAppOrigin();

  try {
    const url = new URL(getInputUrl(input), appOrigin === "unknown" ? "http://localhost" : appOrigin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "[unparseable-url]";
  }
}

function getMethod(init?: RequestInit): string {
  return (init?.method ?? "GET").toUpperCase();
}

function getErrorDetails(error: unknown): Pick<ApiTransportDiagnostic, "errorName" | "errorMessage"> {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: sanitizeErrorMessage(error.message),
    };
  }

  return {
    errorName: "UnknownError",
    errorMessage: sanitizeErrorMessage(String(error)),
  };
}

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/https?:\/\/\S+/gi, "[url]")
    .slice(0, 300);
}

function getRuntimeDetails(): Pick<ApiTransportDiagnostic, "appOrigin" | "platform" | "online"> {
  const online = typeof navigator === "undefined" || typeof navigator.onLine !== "boolean"
    ? null
    : navigator.onLine;

  return {
    appOrigin: getAppOrigin(),
    platform: Capacitor.getPlatform(),
    online,
  };
}

function readStoredDiagnostics(): ApiTransportDiagnostic[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.sessionStorage.getItem(API_TRANSPORT_DIAGNOSTICS_STORAGE_KEY);
    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(storedValue);
    return Array.isArray(parsedValue) ? (parsedValue as ApiTransportDiagnostic[]) : [];
  } catch {
    return [];
  }
}

function persistDiagnostics(diagnostics: ApiTransportDiagnostic[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      API_TRANSPORT_DIAGNOSTICS_STORAGE_KEY,
      JSON.stringify(diagnostics),
    );
  } catch {
    // Diagnostics must never turn a request failure into another application failure.
  }
}

function recordDiagnostic(diagnostic: ApiTransportDiagnostic): ApiTransportDiagnostic {
  const diagnostics = [
    ...readStoredDiagnostics().slice(-(MAX_API_TRANSPORT_DIAGNOSTICS - 1)),
    diagnostic,
  ];

  persistDiagnostics(diagnostics);
  console.error("[MeatLens][API]", diagnostic);
  return diagnostic;
}

export function recordApiTransportFailure({
  input,
  init,
  error,
}: RecordApiTransportFailureOptions): ApiTransportDiagnostic {
  return recordDiagnostic({
    timestamp: new Date().toISOString(),
    stage: "network-error",
    method: getMethod(init),
    url: sanitizeUrl(input),
    ...getRuntimeDetails(),
    ...getErrorDetails(error),
  });
}

export function recordApiTransportResponseFailure({
  input,
  init,
  response,
}: RecordApiTransportResponseFailureOptions): ApiTransportDiagnostic {
  return recordDiagnostic({
    timestamp: new Date().toISOString(),
    stage: "http-error",
    method: getMethod(init),
    url: sanitizeUrl(input),
    ...getRuntimeDetails(),
    status: response.status,
    statusText: response.statusText || undefined,
  });
}

export function getApiTransportDiagnostics(): ApiTransportDiagnostic[] {
  return readStoredDiagnostics();
}

export function clearApiTransportDiagnostics(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(API_TRANSPORT_DIAGNOSTICS_STORAGE_KEY);
  } catch {
    // Storage is optional; in-memory diagnostics are not required for request handling.
  }
}

export function formatApiTransportDiagnostics(): string {
  return getApiTransportDiagnostics()
    .map((diagnostic, index) => {
      const details = [
        `#${index + 1} ${diagnostic.timestamp}`,
        `stage=${diagnostic.stage}`,
        `method=${diagnostic.method}`,
        `url=${diagnostic.url}`,
        `appOrigin=${diagnostic.appOrigin}`,
        `platform=${diagnostic.platform}`,
        `online=${diagnostic.online ?? "unknown"}`,
      ];

      if (diagnostic.status !== undefined) {
        details.push(`status=${diagnostic.status}`);
      }
      if (diagnostic.statusText) {
        details.push(`statusText=${diagnostic.statusText}`);
      }
      if (diagnostic.errorName) {
        details.push(`errorName=${diagnostic.errorName}`);
      }
      if (diagnostic.errorMessage) {
        details.push(`errorMessage=${diagnostic.errorMessage}`);
      }

      return details.join(" | ");
    })
    .join("\n");
}
