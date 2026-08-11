import { useCallback, useMemo, useState } from "react";
import { applyApiRequestInit } from "@/shared/api/request";
import {
  API_DOCS_CATEGORIES,
  API_DOCS_OPERATION_BY_ID,
  API_DOCS_OPERATIONS,
} from "./catalog";
import { buildApiDocsCurl } from "./curl";
import {
  clearApiDocsHistory,
  loadApiDocsHistory,
  saveApiDocsHistory,
  toApiDocsHistoryEntry,
  toApiDocsReplayValues,
  type ApiDocsHistoryEntry,
} from "./history";
import {
  buildApiDocsRequest,
  createDefaultApiDocsEditorValues,
} from "./request";
import {
  readApiDocsResponse,
  type ApiDocsResponse,
} from "./response";
import type {
  ApiDocsEditorValues,
  ApiDocsOperation,
  ApiDocsParameterLocation,
} from "./types";

export interface ApiDocsHookState {
  categories: typeof API_DOCS_CATEGORIES;
  operations: typeof API_DOCS_OPERATIONS;
  selectedOperation: ApiDocsOperation;
  editorValues: ApiDocsEditorValues;
  response: ApiDocsResponse | null;
  lastRequest: ReturnType<typeof buildApiDocsRequest> | null;
  curlCommand: string;
  history: ApiDocsHistoryEntry[];
  isSending: boolean;
  executionError: string | null;
  pendingDeleteConfirmation: boolean;
  selectOperation: (operationId: string) => void;
  setParameterValue: (location: ApiDocsParameterLocation, name: string, value: string) => void;
  setHeaderValue: (name: string, value: string) => void;
  removeHeader: (name: string) => void;
  setBodyValue: (body: string | Record<string, string>) => void;
  setFileValue: (name: string, file: File | null) => void;
  reset: () => void;
  send: (allowDestructive?: boolean) => Promise<void>;
  confirmDelete: () => Promise<void>;
  cancelDelete: () => void;
  replay: (entry: ApiDocsHistoryEntry | undefined) => void;
  clearHistory: () => void;
}

const FIRST_OPERATION = API_DOCS_OPERATIONS[0];

export function useApiDocs(): ApiDocsHookState {
  const [selectedOperationId, setSelectedOperationId] = useState(FIRST_OPERATION.id);
  const [editorValues, setEditorValues] = useState<ApiDocsEditorValues>(() => (
    createDefaultApiDocsEditorValues(FIRST_OPERATION)
  ));
  const [response, setResponse] = useState<ApiDocsResponse | null>(null);
  const [lastRequest, setLastRequest] = useState<ReturnType<typeof buildApiDocsRequest> | null>(null);
  const [history, setHistory] = useState<ApiDocsHistoryEntry[]>(() => loadApiDocsHistory());
  const [isSending, setIsSending] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [pendingDeleteConfirmation, setPendingDeleteConfirmation] = useState(false);

  const selectedOperation = API_DOCS_OPERATION_BY_ID.get(selectedOperationId) ?? FIRST_OPERATION;

  const selectOperation = useCallback((operationId: string) => {
    const operation = API_DOCS_OPERATION_BY_ID.get(operationId);
    if (!operation) return;
    setSelectedOperationId(operation.id);
    setEditorValues(createDefaultApiDocsEditorValues(operation));
    setResponse(null);
    setLastRequest(null);
    setExecutionError(null);
    setPendingDeleteConfirmation(false);
  }, []);

  const setParameterValue = useCallback((location: ApiDocsParameterLocation, name: string, value: string) => {
    setEditorValues((current) => ({
      ...current,
      [location]: { ...current[location], [name]: value },
    }));
  }, []);

  const setHeaderValue = useCallback((name: string, value: string) => {
    setEditorValues((current) => ({
      ...current,
      headers: { ...current.headers, [name]: value },
    }));
  }, []);

  const removeHeader = useCallback((name: string) => {
    setEditorValues((current) => {
      const headers = { ...current.headers };
      delete headers[name];
      return { ...current, headers };
    });
  }, []);

  const setBodyValue = useCallback((body: string | Record<string, string>) => {
    setEditorValues((current) => ({ ...current, body }));
  }, []);

  const setFileValue = useCallback((name: string, file: File | null) => {
    setEditorValues((current) => ({
      ...current,
      files: { ...current.files, [name]: file },
    }));
  }, []);

  const reset = useCallback(() => {
    setEditorValues(createDefaultApiDocsEditorValues(selectedOperation));
    setResponse(null);
    setLastRequest(null);
    setExecutionError(null);
    setPendingDeleteConfirmation(false);
  }, [selectedOperation]);

  const send = useCallback(async (allowDestructive = false): Promise<void> => {
    if (selectedOperation.method === "DELETE" && !allowDestructive) {
      setPendingDeleteConfirmation(true);
      return;
    }

    setPendingDeleteConfirmation(false);
    setExecutionError(null);

    let request: ReturnType<typeof buildApiDocsRequest>;
    try {
      request = buildApiDocsRequest(selectedOperation, editorValues);
    } catch (error) {
      setExecutionError(error instanceof Error ? error.message : "Invalid request");
      return;
    }

    setIsSending(true);
    setResponse(null);
    setLastRequest(request);
    const startedAt = performance.now();

    try {
      const fetchResponse = await fetch(request.url, applyApiRequestInit(request.init));
      const normalizedResponse = await readApiDocsResponse(fetchResponse, Math.round(performance.now() - startedAt));
      setResponse(normalizedResponse);
      const entry = toApiDocsHistoryEntry({
        operationId: selectedOperation.id,
        operation: selectedOperation,
        request,
        values: editorValues,
        status: normalizedResponse.status,
        elapsedMs: normalizedResponse.elapsedMs,
      });
      saveApiDocsHistory(entry);
      setHistory(loadApiDocsHistory());
    } catch (error) {
      setExecutionError(error instanceof Error ? error.message : "Request failed");
    } finally {
      setIsSending(false);
    }
  }, [editorValues, selectedOperation]);

  const confirmDelete = useCallback(async () => {
    await send(true);
  }, [send]);

  const cancelDelete = useCallback(() => {
    setPendingDeleteConfirmation(false);
  }, []);

  const replay = useCallback((entry: ApiDocsHistoryEntry | undefined) => {
    if (!entry) return;
    const operation = API_DOCS_OPERATION_BY_ID.get(entry.operationId);
    if (!operation) return;
    setSelectedOperationId(operation.id);
    setEditorValues(toApiDocsReplayValues(entry));
    setResponse(null);
    setLastRequest(null);
    setExecutionError(null);
    setPendingDeleteConfirmation(false);
  }, []);

  const clearHistory = useCallback(() => {
    clearApiDocsHistory();
    setHistory([]);
  }, []);

  const curlCommand = useMemo(() => (lastRequest ? buildApiDocsCurl(lastRequest) : ""), [lastRequest]);

  return {
    categories: API_DOCS_CATEGORIES,
    operations: API_DOCS_OPERATIONS,
    selectedOperation,
    editorValues,
    response,
    lastRequest,
    curlCommand,
    history,
    isSending,
    executionError,
    pendingDeleteConfirmation,
    selectOperation,
    setParameterValue,
    setHeaderValue,
    removeHeader,
    setBodyValue,
    setFileValue,
    reset,
    send,
    confirmDelete,
    cancelDelete,
    replay,
    clearHistory,
  };
}
