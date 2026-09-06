export const API_DOCS_REDACTED_VALUE = "[redacted]";

const TRANSPORT_SECRET_HEADERS = new Set(["authorization", "x-csrf-token", "x-transport-key"]);

const SENSITIVE_KEY_PATTERN = /(password|token|secret|api[-_]?key|authorization|credential)/i;

export function isSensitiveKey(name: string, explicitNames: string[] = []): boolean {
  const normalizedName = name.trim().toLowerCase();
  return explicitNames.some((explicitName) => explicitName.trim().toLowerCase() === normalizedName)
    || SENSITIVE_KEY_PATTERN.test(name);
}

export function redactUnknown(value: unknown, explicitNames: string[] = []): unknown {
  if (Array.isArray(value)) return value.map((item) => redactUnknown(item, explicitNames));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [
      key,
      isSensitiveKey(key, explicitNames) ? API_DOCS_REDACTED_VALUE : redactUnknown(entryValue, explicitNames),
    ]),
  );
}

export function redactJsonText(value: string, explicitNames: string[] = []): string {
  try {
    return JSON.stringify(redactUnknown(JSON.parse(value), explicitNames), null, 2);
  } catch {
    return API_DOCS_REDACTED_VALUE;
  }
}

export function redactRecord(
  values: Record<string, string>,
  explicitNames: string[] = [],
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => [
      name,
      isSensitiveKey(name, explicitNames) ? API_DOCS_REDACTED_VALUE : value,
    ]),
  );
}

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([name]) => !TRANSPORT_SECRET_HEADERS.has(name.toLowerCase()))
      .map(([name, value]) => [
        name,
        isSensitiveKey(name) ? API_DOCS_REDACTED_VALUE : value,
      ]),
  );
}

export function sanitizeUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    for (const [name] of parsedUrl.searchParams.entries()) {
      if (isSensitiveKey(name)) parsedUrl.searchParams.set(name, API_DOCS_REDACTED_VALUE);
    }
    return parsedUrl.toString();
  } catch {
    return url;
  }
}
