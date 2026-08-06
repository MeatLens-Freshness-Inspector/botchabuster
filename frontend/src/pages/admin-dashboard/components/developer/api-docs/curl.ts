import type { ApiDocsRequest } from "./request";

const PROTECTED_HEADERS = new Set(["authorization", "x-csrf-token"]);

function quote(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

export function buildApiDocsCurl(request: ApiDocsRequest): string {
  const command = [`curl -X ${request.init.method ?? "GET"}`, quote(request.url)];
  request.headers.forEach((value, name) => {
    if (!PROTECTED_HEADERS.has(name.toLowerCase())) {
      command.push(`-H ${quote(`${name}: ${value}`)}`);
    }
  });

  if (request.bodyPreview && request.bodyPreview !== "[multipart form-data]") {
    command.push(`--data-raw ${quote(request.bodyPreview)}`);
  }

  return command.join(" ");
}
