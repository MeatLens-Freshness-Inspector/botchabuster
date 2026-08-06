import type { ApiDocsEditorValues } from "./types";
import type { ApiDocsRequest } from "./request";
import type { ApiDocsOperation } from "./types";
import { redactHeaders, redactJsonText, redactRecord } from "./redaction";

export const API_DOCS_HISTORY_STORAGE_KEY = "meatlens-api-docs-history";
const MAX_HISTORY_ENTRIES = 20;

export interface ApiDocsHistoryValues {
  path: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: string | Record<string, string>;
}

export interface ApiDocsHistoryEntry {
  id: string;
  operationId: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  values: ApiDocsHistoryValues;
  status: number | null;
  elapsedMs: number | null;
  createdAt: string;
}

function getStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  return redactHeaders(headers);
}

function sanitizeBody(body: string | Record<string, string>, operation?: ApiDocsOperation): string | Record<string, string> {
  if (typeof body === "string") {
    if (operation?.body.mode === "json") return redactJsonText(body, operation.body.sensitiveFields);
    return body;
  }

  return redactRecord(body, operation?.body.mode === "json" ? operation.body.sensitiveFields : []);
}

function isHistoryEntry(value: unknown): value is ApiDocsHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<ApiDocsHistoryEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.operationId === "string" &&
    typeof entry.method === "string" &&
    typeof entry.url === "string" &&
    typeof entry.headers === "object" &&
    entry.headers !== null &&
    typeof entry.values === "object" &&
    entry.values !== null &&
    typeof entry.createdAt === "string"
  );
}

export function loadApiDocsHistory(storage?: Storage): ApiDocsHistoryEntry[] {
  const target = getStorage(storage);
  if (!target) return [];

  try {
    const raw = target.getItem(API_DOCS_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryEntry).slice(0, MAX_HISTORY_ENTRIES).map((entry) => ({
      ...entry,
      headers: sanitizeHeaders(entry.headers),
      values: {
        ...entry.values,
        headers: sanitizeHeaders(entry.values.headers),
        body: sanitizeBody(entry.values.body),
      },
    }));
  } catch {
    return [];
  }
}

export function saveApiDocsHistory(entry: ApiDocsHistoryEntry, storage?: Storage): void {
  const target = getStorage(storage);
  if (!target) return;

  const sanitizedEntry: ApiDocsHistoryEntry = {
    ...entry,
    headers: sanitizeHeaders(entry.headers),
    values: {
      ...entry.values,
      headers: sanitizeHeaders(entry.values.headers),
      body: sanitizeBody(entry.values.body),
    },
  };

  target.setItem(
    API_DOCS_HISTORY_STORAGE_KEY,
    JSON.stringify([sanitizedEntry, ...loadApiDocsHistory(target)].slice(0, MAX_HISTORY_ENTRIES)),
  );
}

export function clearApiDocsHistory(storage?: Storage): void {
  getStorage(storage)?.removeItem(API_DOCS_HISTORY_STORAGE_KEY);
}

export function toApiDocsHistoryEntry(input: {
  operationId: string;
  operation: ApiDocsOperation;
  request: ApiDocsRequest;
  values: ApiDocsEditorValues;
  status: number | null;
  elapsedMs: number | null;
}): ApiDocsHistoryEntry {
  const headers: Record<string, string> = {};
  input.request.headers.forEach((value, name) => {
    headers[name] = value;
  });

  return {
    id: `${input.operationId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    operationId: input.operationId,
    method: input.request.init.method ?? "GET",
    url: input.request.safeUrl,
    headers,
    values: {
      path: { ...input.values.path },
      query: { ...input.values.query },
      headers: sanitizeHeaders(input.values.headers),
      body: sanitizeBody(input.values.body, input.operation),
    },
    status: input.status,
    elapsedMs: input.elapsedMs,
    createdAt: new Date().toISOString(),
  };
}

export function toApiDocsReplayValues(entry: ApiDocsHistoryEntry): ApiDocsEditorValues {
  return {
    path: { ...entry.values.path },
    query: { ...entry.values.query },
    headers: { ...entry.values.headers },
    body: typeof entry.values.body === "string" ? entry.values.body : { ...entry.values.body },
    files: {},
  };
}
