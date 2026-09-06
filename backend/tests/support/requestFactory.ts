import { createPublicKey, randomBytes } from "node:crypto";
import {
  createEncryptedTransportEnvelope,
  decodeBase64Url,
  decryptAesGcm,
  getTransportAad,
  parseEncryptedTransportEnvelope,
  wrapAesKey,
} from "../../src/modules/transport/infrastructure/TransportCrypto";
import type {
  EncryptedTransportEnvelope,
  TransportPublicKey,
  TransportResponsePayload,
} from "../../src/modules/transport/domain/transport";

export function createJsonRequest(body: unknown, init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  return {
    ...init,
    headers,
    body: JSON.stringify(body),
  };
}

export async function getTransportPublicKeyMetadata(baseUrl: string): Promise<TransportPublicKey> {
  const response = await fetch(`${baseUrl}/api/transport/public-key`);
  if (!response.ok) throw new Error("Failed to fetch transport public key");
  return response.json() as Promise<TransportPublicKey>;
}

export async function getEncryptedTestClient(baseUrl: string): Promise<EncryptedRequestClient> {
  return createEncryptedRequestClient(baseUrl, await getTransportPublicKeyMetadata(baseUrl));
}

function resolveRequestUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function serializeBody(body: BodyInit | null | undefined, contentType: string): { kind: "json" | "bytes"; contentType: string; value?: string } | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string" && contentType.toLowerCase().includes("application/json")) {
    return { kind: "json", contentType, value: body };
  }

  let bytes: Buffer;
  if (typeof body === "string") bytes = Buffer.from(body, "utf8");
  else if (body instanceof ArrayBuffer) bytes = Buffer.from(body);
  else if (ArrayBuffer.isView(body)) bytes = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  else throw new Error("Unsupported encrypted test request body");

  return {
    kind: "bytes",
    contentType: contentType || "application/octet-stream",
    value: bytes.toString("base64url"),
  };
}

function readLogicalResponsePayload(value: unknown): TransportResponsePayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid encrypted response");
  const payload = value as Record<string, unknown>;
  if (
    typeof payload.contentType !== "string"
    || typeof payload.body !== "string"
    || (payload.bodyEncoding !== "utf8" && payload.bodyEncoding !== "base64")
    || !payload.headers
    || typeof payload.headers !== "object"
    || Array.isArray(payload.headers)
  ) throw new Error("Invalid encrypted response");
  return payload as unknown as TransportResponsePayload;
}

export interface EncryptedRequestClient {
  request(path: string, init?: RequestInit): Promise<Response>;
  json(path: string, body: unknown, init?: RequestInit): Promise<Response>;
}

export function createEncryptedRequestClient(
  baseUrl: string,
  publicKeyMetadata: TransportPublicKey,
): EncryptedRequestClient {
  const publicKey = createPublicKey({
    key: Buffer.from(decodeBase64Url(publicKeyMetadata.publicKey)),
    format: "der",
    type: "spki",
  });

  return {
    async request(path, init = {}): Promise<Response> {
      const url = resolveRequestUrl(baseUrl, path);
      const parsedUrl = new URL(url);
      const method = (init.method ?? "GET").toUpperCase();
      const headers = new Headers(init.headers);
      const aesKey = randomBytes(32);
      const aad = getTransportAad(method, parsedUrl.pathname);
      const wrappedKey = wrapAesKey(aesKey, publicKey);
      headers.set("X-Transport-Key", `${publicKeyMetadata.keyId}.${wrappedKey}`);

      const logicalBody = serializeBody(init.body, headers.get("Content-Type") ?? "");
      const nextInit: RequestInit = { ...init, method, headers };
      if (logicalBody) {
        nextInit.body = JSON.stringify(createEncryptedTransportEnvelope(
          publicKeyMetadata.keyId,
          Buffer.from(JSON.stringify(logicalBody), "utf8"),
          aesKey,
          aad,
        ));
        headers.set("Content-Type", "application/json");
      }

      const response = await fetch(url, nextInit);
      if (response.status === 204 || response.status === 304 || !response.body) return response;
      const rawBody = await response.text();
      if (!rawBody) return response;
      const envelope = parseEncryptedTransportEnvelope(JSON.parse(rawBody) as EncryptedTransportEnvelope, {
        expectedKeyId: publicKeyMetadata.keyId,
        maxCiphertextBytes: 16 * 1024 * 1024,
      });
      const logical = readLogicalResponsePayload(JSON.parse(
        decryptAesGcm(envelope, aesKey, aad).toString("utf8"),
      ) as unknown);
      const responseHeaders = new Headers(response.headers);
      for (const [name, value] of Object.entries(logical.headers)) responseHeaders.set(name, value);
      responseHeaders.set("Content-Type", logical.contentType);
      responseHeaders.delete("Content-Length");
      const body = logical.bodyEncoding === "base64"
        ? Buffer.from(decodeBase64Url(logical.body))
        : logical.body;
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    },
    async json(path, body, init = {}): Promise<Response> {
      const headers = new Headers(init.headers);
      headers.set("Content-Type", "application/json");
      return this.request(path, { ...init, headers, body: JSON.stringify(body) });
    },
  };
}

export async function createEncryptedJsonRequest(
  baseUrl: string,
  path: string,
  body: unknown,
  init: RequestInit = {},
): Promise<Response> {
  const metadata = await getTransportPublicKeyMetadata(baseUrl);
  return createEncryptedRequestClient(baseUrl, metadata).json(path, body, init);
}
