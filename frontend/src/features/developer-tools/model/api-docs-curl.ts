import type { ApiDocsRequest } from "./api-docs-request";
import { redactHeaders } from "./api-docs-redaction";

const PROTECTED_HEADERS = new Set(["authorization", "x-csrf-token"]);

function quote(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

export function buildApiDocsCurl(request: ApiDocsRequest): string {
  const command = [`curl -X ${request.init.method ?? "GET"}`, quote(request.safeUrl)];
  const headers: Record<string, string> = {};
  request.headers.forEach((value, name) => { headers[name] = value; });
  for (const [name, value] of Object.entries(redactHeaders(headers))) {
    if (!PROTECTED_HEADERS.has(name.toLowerCase())) command.push(`-H ${quote(`${name}: ${value}`)}`);
  }

  if (request.curlBodyParts.length > 0) {
    for (const part of request.curlBodyParts) command.push(`-F ${quote(part)}`);
  } else if (request.bodyPreview && request.bodyPreview !== "[multipart form-data]") {
    command.push(`--data-raw ${quote(request.bodyPreview)}`);
  }

  return command.join(" ");
}
