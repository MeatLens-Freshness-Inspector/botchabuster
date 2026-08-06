import { createAuthHeaders } from "@/lib/authCache";
import { API_BASE_URL } from "@/integrations/api/apiBaseUrl";
import { redactJsonText, redactRecord, sanitizeUrl } from "./redaction";
import type {
  ApiDocsBodyField,
  ApiDocsEditorValues,
  ApiDocsOperation,
} from "./types";

const PROTECTED_HEADERS = new Set(["authorization", "x-csrf-token"]);

export interface ApiDocsRequest {
  url: string;
  safeUrl: string;
  init: RequestInit;
  headers: Headers;
  bodyPreview: string;
  curlBodyParts: string[];
}

function getRecordValue(record: string | Record<string, string>, key: string): string {
  if (typeof record === "string") return "";
  return record[key] ?? "";
}

function getBodyRecord(body: string | Record<string, string>): Record<string, string> {
  return typeof body === "string" ? {} : body;
}

function hasValue(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function getPathValue(values: ApiDocsEditorValues, name: string): string {
  return values.path[name] ?? "";
}

function getQueryValue(values: ApiDocsEditorValues, name: string): string {
  return values.query[name] ?? "";
}

function validateBodyFields(fields: ApiDocsBodyField[], values: ApiDocsEditorValues): string | null {
  const body = getBodyRecord(values.body);

  for (const field of fields) {
    const fieldHasValue = field.kind === "file"
      ? Boolean(values.files[field.name])
      : hasValue(body[field.name]);

    if (field.required && !fieldHasValue) {
      return `Required field: ${field.name}`;
    }
  }

  return null;
}

export function validateApiDocsEditor(
  operation: ApiDocsOperation,
  values: ApiDocsEditorValues,
): string | null {
  for (const parameter of operation.parameters) {
    const value = parameter.location === "path"
      ? getPathValue(values, parameter.name)
      : getQueryValue(values, parameter.name);

    if (parameter.required && !hasValue(value)) {
      return `Required parameter: ${parameter.name}`;
    }
  }

  if (operation.body.mode === "json") {
    try {
      JSON.parse(typeof values.body === "string" ? values.body : JSON.stringify(values.body));
    } catch {
      return "Request body must be valid JSON";
    }
  }

  if (operation.body.mode === "urlencoded" || operation.body.mode === "form-data") {
    return validateBodyFields(operation.body.fields, values);
  }

  return null;
}

export function createDefaultApiDocsEditorValues(operation: ApiDocsOperation): ApiDocsEditorValues {
  const path: Record<string, string> = {};
  const query: Record<string, string> = {};

  for (const parameter of operation.parameters) {
    const target = parameter.location === "path" ? path : query;
    target[parameter.name] = parameter.defaultValue ?? "";
  }

  if (operation.body.mode === "json") {
    return { path, query, headers: {}, body: operation.body.defaultValue, files: {} };
  }

  if (operation.body.mode === "urlencoded" || operation.body.mode === "form-data") {
    const body: Record<string, string> = {};
    for (const field of operation.body.fields) {
      if (field.kind === "text") body[field.name] = field.defaultValue ?? "";
    }
    return { path, query, headers: {}, body, files: {} };
  }

  return { path, query, headers: {}, body: "", files: {} };
}

function resolvePath(operation: ApiDocsOperation, values: ApiDocsEditorValues): string {
  return operation.path.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    return encodeURIComponent(getPathValue(values, name));
  });
}

function createHeaders(values: ApiDocsEditorValues): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(values.headers)) {
    const normalizedName = name.trim();
    if (!normalizedName || PROTECTED_HEADERS.has(normalizedName.toLowerCase())) continue;
    headers.set(normalizedName, value);
  }
  return createAuthHeaders(headers);
}

function createJsonBody(values: ApiDocsEditorValues): string {
  return typeof values.body === "string" ? values.body : JSON.stringify(values.body);
}

function createUrlencodedBody(values: ApiDocsEditorValues): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(getBodyRecord(values.body))) {
    if (value !== "") params.set(name, value);
  }
  return params.toString();
}

function createFormDataBody(operation: ApiDocsOperation, values: ApiDocsEditorValues): FormData {
  if (operation.body.mode !== "form-data") {
    throw new Error("Form-data body requested for a non-form operation");
  }

  const formData = new FormData();
  const body = getBodyRecord(values.body);
  for (const field of operation.body.fields) {
    if (field.kind === "file") {
      const file = values.files[field.name];
      if (file) formData.append(field.name, file);
    } else if (body[field.name] !== undefined && body[field.name] !== "") {
      formData.append(field.name, body[field.name]);
    }
  }
  return formData;
}

function createCurlBodyParts(operation: ApiDocsOperation, values: ApiDocsEditorValues): string[] {
  if (operation.body.mode !== "form-data") return [];

  const body = typeof values.body === "string" ? {} : values.body;
  const parts: string[] = [];
  for (const field of operation.body.fields) {
    if (field.kind === "file") {
      if (values.files[field.name]) parts.push(`${field.name}=@<select file>`);
      continue;
    }

    if (body[field.name] !== undefined && body[field.name] !== "") {
      const safeValue = redactRecord({ [field.name]: body[field.name] }, operation.body.fields.filter((entry) => entry.kind === "text").map((entry) => entry.name))[field.name];
      parts.push(`${field.name}=${safeValue}`);
    }
  }
  return parts;
}

export function buildApiDocsRequest(
  operation: ApiDocsOperation,
  values: ApiDocsEditorValues,
): ApiDocsRequest {
  const validationError = validateApiDocsEditor(operation, values);
  if (validationError) throw new Error(validationError);

  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const path = resolvePath(operation, values);
  const url = new URL(`${baseUrl}${path}`);

  for (const parameter of operation.parameters) {
    if (parameter.location !== "query") continue;
    const value = getQueryValue(values, parameter.name);
    if (value !== "") url.searchParams.set(parameter.name, value);
  }

  const headers = createHeaders(values);
  let body: BodyInit | undefined;
  let bodyPreview = "";
  let curlBodyParts: string[] = [];

  if (operation.body.mode === "json") {
    headers.set("Content-Type", operation.body.contentType);
    body = createJsonBody(values);
    bodyPreview = redactJsonText(body, operation.body.sensitiveFields);
  } else if (operation.body.mode === "urlencoded") {
    headers.set("Content-Type", operation.body.contentType);
    body = createUrlencodedBody(values);
    const bodyRecord = typeof values.body === "string" ? {} : values.body;
    bodyPreview = new URLSearchParams(redactRecord(bodyRecord)).toString();
  } else if (operation.body.mode === "form-data") {
    body = createFormDataBody(operation, values);
    bodyPreview = "[multipart form-data]";
    curlBodyParts = createCurlBodyParts(operation, values);
  }

  return {
    url: url.toString(),
    safeUrl: sanitizeUrl(url.toString()),
    init: { method: operation.method, headers, body },
    headers,
    bodyPreview,
    curlBodyParts,
  };
}
