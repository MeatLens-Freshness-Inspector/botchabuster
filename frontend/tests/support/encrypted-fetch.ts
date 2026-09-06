import {
  constants,
  createCipheriv,
  createDecipheriv,
  generateKeyPairSync,
  privateDecrypt,
  randomBytes,
  webcrypto,
} from "node:crypto";
import {
  clearTransportPublicKeyCache,
} from "../../src/shared/api/transport-crypto";
import type { EncryptedTransportEnvelope, TransportRequestPayload } from "../../src/shared/api/transport-types";

export interface EncryptedMockRequest {
  input: RequestInfo | URL;
  init?: RequestInit;
  headers: Headers;
  method: string;
  rawBody: string;
  logicalPayload: TransportRequestPayload | null;
}

type MockResponseFactory = (request: EncryptedMockRequest) => Response | Promise<Response>;

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function encodeBase64Url(value: Uint8Array): string {
  return Buffer.from(value).toString("base64url");
}

function decryptRequestBody(rawBody: string, rawKey: Buffer, method: string, pathname: string): Buffer {
  const envelope = JSON.parse(rawBody) as EncryptedTransportEnvelope;
  const ciphertextWithTag = decodeBase64Url(envelope.ciphertext);
  const decipher = createDecipheriv("aes-256-gcm", rawKey, decodeBase64Url(envelope.iv));
  decipher.setAAD(Buffer.from(`${method} ${pathname}`, "utf8"));
  decipher.setAuthTag(ciphertextWithTag.subarray(-16));
  return Buffer.concat([decipher.update(ciphertextWithTag.subarray(0, -16)), decipher.final()]);
}

function responseBodyEncoding(contentType: string): "utf8" | "base64" {
  return contentType.toLowerCase().startsWith("application/json") || contentType.toLowerCase().startsWith("text/")
    ? "utf8"
    : "base64";
}

async function readRequestPayload(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"],
): Promise<{ headers: Headers; method: string; rawBody: string; logicalPayload: TransportRequestPayload | null }> {
  const headers = new Headers(init?.headers);
  const method = (init?.method ?? "GET").toUpperCase();
  const rawBody = typeof init?.body === "string" ? init.body : "";
  if (!rawBody) return { headers, method, rawBody, logicalPayload: null };

  const transportHeader = headers.get("X-Transport-Key") ?? "";
  const separator = transportHeader.indexOf(".");
  if (separator <= 0) throw new Error("Encrypted test request is missing its transport key");
  const rawKey = privateDecrypt({
    key: privateKey,
    padding: constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: "sha256",
  }, Buffer.from(transportHeader.slice(separator + 1), "base64url"));
  const url = new URL(String(input), "http://localhost/");
  const plaintext = decryptRequestBody(rawBody, rawKey, method, url.pathname);
  return {
    headers,
    method,
    rawBody,
    logicalPayload: JSON.parse(new TextDecoder().decode(plaintext)) as TransportRequestPayload,
  };
}

async function encryptMockResponse(
  response: Response,
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"],
): Promise<Response> {
  if (response.status === 204 || response.status === 304 || !response.body) return response;

  const headers = new Headers(init?.headers);
  const transportHeader = headers.get("X-Transport-Key") ?? "";
  const separator = transportHeader.indexOf(".");
  if (separator <= 0) return response;
  const rawKey = privateDecrypt({
    key: privateKey,
    padding: constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: "sha256",
  }, Buffer.from(transportHeader.slice(separator + 1), "base64url"));
  const url = new URL(String(input), "http://localhost/");
  const contentType = response.headers.get("content-type") ?? "application/json; charset=utf-8";
  const bytes = new Uint8Array(await response.clone().arrayBuffer());
  const bodyEncoding = responseBodyEncoding(contentType);
  const logicalBody = {
    contentType,
    headers: Object.fromEntries(
      Array.from(response.headers.entries()).filter(([name]) => (
        !["content-type", "content-length", "content-encoding", "transfer-encoding"].includes(name.toLowerCase())
      )),
    ),
    body: bodyEncoding === "base64"
      ? Buffer.from(bytes).toString("base64url")
      : new TextDecoder().decode(bytes),
    bodyEncoding,
  } as const;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", rawKey, iv);
  cipher.setAAD(Buffer.from(`${(init?.method ?? "GET").toUpperCase()} ${url.pathname}`, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(logicalBody), "utf8")),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return new Response(JSON.stringify({
    version: 1,
    algorithm: "A256GCM",
    keyId: transportHeader.slice(0, separator),
    iv: encodeBase64Url(iv),
    ciphertext: encodeBase64Url(ciphertext),
  }), {
    status: response.status,
    statusText: response.statusText,
    headers: { "Content-Type": "application/json" },
  });
}

export function installEncryptedFetch(factory: MockResponseFactory): () => void {
  const originalFetch = globalThis.fetch;
  const originalCrypto = globalThis.crypto;
  const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const publicKey = pair.publicKey.export({ type: "spki", format: "der" }).toString("base64url");
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
  clearTransportPublicKeyCache();

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith("/transport/public-key")) {
      return new Response(JSON.stringify({
        version: 1,
        algorithm: "RSA-OAEP-256",
        keyId: "test-v1",
        publicKey,
      }), { status: 200 });
    }

    const requestData = await readRequestPayload(input, init, pair.privateKey);
    const response = await factory({ input, init, ...requestData });
    return encryptMockResponse(response, input, init, pair.privateKey);
  }) as typeof globalThis.fetch;

  return () => {
    clearTransportPublicKeyCache();
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: originalCrypto });
  };
}
