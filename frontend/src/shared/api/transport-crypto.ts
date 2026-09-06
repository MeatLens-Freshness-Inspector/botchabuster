import { API_BASE_URL } from "./base-url";
import type {
  EncryptedTransportEnvelope,
  TransportCiphertext,
  TransportPublicKey,
  TransportRequestPayload,
} from "./transport-types";

export interface GeneratedTransportKey {
  aesKey: CryptoKey;
  rawKey: Uint8Array;
}

export interface PreparedTransportRequest {
  init: RequestInit;
  transport: {
    key: CryptoKey;
    aad: Uint8Array;
    keyId: string;
  } | null;
}

export const MAX_TRANSPORT_REQUEST_BYTES = 12 * 1024 * 1024;

export class TransportResponseDecryptionError extends Error {
  constructor() {
    super("Invalid encrypted response");
    this.name = "TransportResponseDecryptionError";
  }
}

const BASE64_URL_PATTERN = /^(?:[A-Za-z0-9_-]{2,})?$/;
let cachedTransportPublicKey: TransportPublicKey | null = null;
let publicKeyRequest: Promise<TransportPublicKey> | null = null;

function subtleCrypto(): SubtleCrypto {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle) {
    throw new Error("Web Crypto API is unavailable");
  }
  return cryptoApi.subtle;
}

export function encodeBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function decodeBase64Url(value: string): Uint8Array {
  if (
    value.length === 0
    || value.length % 4 === 1
    || !BASE64_URL_PATTERN.test(value)
  ) {
    throw new Error("Invalid base64url value");
  }

  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const decoded = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (encodeBase64Url(decoded) !== value) {
    throw new Error("Invalid base64url value");
  }
  return decoded;
}

export async function importTransportPublicKey(spki: string): Promise<CryptoKey> {
  return subtleCrypto().importKey(
    "spki",
    decodeBase64Url(spki),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
}

export async function generateTransportRequestKey(): Promise<GeneratedTransportKey> {
  const aesKey = await subtleCrypto().generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  ) as CryptoKey;
  const rawKey = new Uint8Array(await subtleCrypto().exportKey("raw", aesKey));
  return { aesKey, rawKey };
}

export async function encryptTransportBytes(
  plaintext: Uint8Array,
  key: CryptoKey,
  aad: Uint8Array,
): Promise<TransportCiphertext> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await subtleCrypto().encrypt(
    { name: "AES-GCM", iv, additionalData: aad, tagLength: 128 },
    key,
    plaintext,
  );
  return {
    iv: encodeBase64Url(iv),
    ciphertext: encodeBase64Url(new Uint8Array(ciphertext)),
  };
}

export async function decryptTransportBytes(
  encrypted: TransportCiphertext,
  key: CryptoKey,
  aad: Uint8Array,
): Promise<Uint8Array> {
  try {
    const plaintext = await subtleCrypto().decrypt(
      {
        name: "AES-GCM",
        iv: decodeBase64Url(encrypted.iv),
        additionalData: aad,
        tagLength: 128,
      },
      key,
      decodeBase64Url(encrypted.ciphertext),
    );
    return new Uint8Array(plaintext);
  } catch {
    throw new Error("Transport decryption failed");
  }
}

function parseTransportResponseEnvelope(value: unknown, expectedKeyId: string): TransportCiphertext {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid encrypted response");
  }
  const envelope = value as Record<string, unknown>;
  if (
    envelope.version !== 1
    || envelope.algorithm !== "A256GCM"
    || envelope.keyId !== expectedKeyId
    || typeof envelope.iv !== "string"
    || typeof envelope.ciphertext !== "string"
  ) {
    throw new Error("Invalid encrypted response");
  }
  const iv = decodeBase64Url(envelope.iv);
  if (iv.length !== 12) throw new Error("Invalid encrypted response");
  decodeBase64Url(envelope.ciphertext);
  return { iv: envelope.iv, ciphertext: envelope.ciphertext };
}

function readLogicalResponsePayload(value: unknown): {
  contentType: string;
  headers: Record<string, string>;
  body: string;
  bodyEncoding: "utf8" | "base64";
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid encrypted response");
  }
  const payload = value as Record<string, unknown>;
  if (
    typeof payload.contentType !== "string"
    || typeof payload.body !== "string"
    || (payload.bodyEncoding !== "utf8" && payload.bodyEncoding !== "base64")
    || !payload.headers
    || typeof payload.headers !== "object"
    || Array.isArray(payload.headers)
    || Object.entries(payload.headers).some(([name, headerValue]) => (
      name.trim().length === 0 || typeof headerValue !== "string"
    ))
  ) {
    throw new Error("Invalid encrypted response");
  }
  return {
    contentType: payload.contentType,
    headers: payload.headers as Record<string, string>,
    body: payload.body,
    bodyEncoding: payload.bodyEncoding,
  };
}

export async function decryptTransportResponse(
  response: Response,
  transport: NonNullable<PreparedTransportRequest["transport"]>,
): Promise<Response> {
  if (response.status === 204 || response.status === 304 || !response.body) return response;

  const rawBody = await response.text();
  if (rawBody.length === 0) return response;

  try {
    const envelope = parseTransportResponseEnvelope(JSON.parse(rawBody) as unknown, transport.keyId);
    const plaintext = await decryptTransportBytes(envelope, transport.key, transport.aad);
    const payload = readLogicalResponsePayload(JSON.parse(new TextDecoder().decode(plaintext)) as unknown);
    const headers = new Headers(payload.headers);
    headers.set("Content-Type", payload.contentType);
    const body = payload.bodyEncoding === "base64"
      ? decodeBase64Url(payload.body)
      : payload.body;
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch {
    throw new TransportResponseDecryptionError();
  }
}

function contentTypeForBody(contentType: string | undefined): string {
  return contentType?.trim() || "application/octet-stream";
}

function bytesToTransportPayload(bytes: Uint8Array, contentType: string): TransportRequestPayload | null {
  if (bytes.length === 0) return null;
  if (bytes.length > MAX_TRANSPORT_REQUEST_BYTES) {
    throw new Error("Transport request body is too large");
  }
  return {
    kind: "bytes",
    contentType: contentTypeForBody(contentType),
    value: encodeBase64Url(bytes),
  };
}

export async function serializeTransportFormData(formData: FormData): Promise<TransportRequestPayload> {
  const fields: Record<string, string> = {};
  const files: NonNullable<TransportRequestPayload["files"]> = [];
  let totalBytes = 0;

  for (const [fieldName, value] of formData.entries()) {
    if (typeof value === "string") {
      totalBytes += new TextEncoder().encode(value).length;
      if (totalBytes > MAX_TRANSPORT_REQUEST_BYTES) throw new Error("Transport request body is too large");
      fields[fieldName] = value;
      continue;
    }

    if (typeof Blob === "undefined" || !(value instanceof Blob)) {
      throw new Error("Unsupported transport form field");
    }
    const bytes = new Uint8Array(await value.arrayBuffer());
    totalBytes += bytes.length;
    if (totalBytes > MAX_TRANSPORT_REQUEST_BYTES) throw new Error("Transport request body is too large");
    const namedValue = value as Blob & { name?: unknown };
    const fileName = typeof namedValue.name === "string" && namedValue.name.length > 0
      ? namedValue.name
      : "blob";
    files.push({
      fieldName,
      fileName,
      mimeType: value.type || "application/octet-stream",
      size: bytes.length,
      bytes: encodeBase64Url(bytes),
    });
  }

  return {
    kind: "form-data",
    contentType: "multipart/form-data",
    value: JSON.stringify(fields),
    files,
  };
}

export async function serializeTransportRequestBody(
  body: BodyInit | null | undefined,
  contentType = "",
): Promise<TransportRequestPayload | null> {
  if (body === undefined || body === null) return null;

  if (typeof body === "string") {
    const bytes = new TextEncoder().encode(body);
    if (bytes.length > MAX_TRANSPORT_REQUEST_BYTES) {
      throw new Error("Transport request body is too large");
    }
    if (contentType.toLowerCase().includes("application/json")) {
      return bytes.length === 0
        ? null
        : { kind: "json", contentType, value: body };
    }
    return bytesToTransportPayload(bytes, contentTypeForBody(contentType || "text/plain;charset=UTF-8"));
  }

  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return serializeTransportFormData(body);
  }

  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
    return bytesToTransportPayload(
      new TextEncoder().encode(body.toString()),
      contentTypeForBody(contentType || "application/x-www-form-urlencoded;charset=UTF-8"),
    );
  }

  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return bytesToTransportPayload(
      new Uint8Array(await body.arrayBuffer()),
      contentTypeForBody(contentType || body.type),
    );
  }

  if (body instanceof ArrayBuffer) {
    return bytesToTransportPayload(new Uint8Array(body), contentTypeForBody(contentType));
  }

  if (ArrayBuffer.isView(body)) {
    return bytesToTransportPayload(
      new Uint8Array(body.buffer as ArrayBuffer, body.byteOffset, body.byteLength),
      contentTypeForBody(contentType),
    );
  }

  throw new Error("Unsupported transport request body");
}

function isTransportPublicKey(value: unknown): value is TransportPublicKey {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const key = value as Record<string, unknown>;
  return (
    key.version === 1
    && key.algorithm === "RSA-OAEP-256"
    && typeof key.keyId === "string"
    && key.keyId.trim().length > 0
    && typeof key.publicKey === "string"
    && BASE64_URL_PATTERN.test(key.publicKey)
  );
}

function requestUrl(input: RequestInfo | URL): URL {
  if (typeof Request !== "undefined" && input instanceof Request) {
    return new URL(input.url);
  }
  return new URL(String(input), globalThis.location?.href ?? "http://localhost/");
}

function requestMethod(input: RequestInfo | URL, init: RequestInit): string {
  if (init.method) return init.method.toUpperCase();
  if (typeof Request !== "undefined" && input instanceof Request) return input.method.toUpperCase();
  return "GET";
}

function isPlaintextTransportEndpoint(url: URL, method: string): boolean {
  if (method !== "GET") return false;
  return url.pathname === new URL(`${API_BASE_URL}/analysis/health`, url).pathname
    || url.pathname === new URL(`${API_BASE_URL}/transport/public-key`, url).pathname;
}

function mergeRequestHeaders(input: RequestInfo | URL, init: RequestInit): Headers {
  const headers = new Headers(
    typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
  );
  new Headers(init.headers).forEach((value, name) => headers.set(name, value));
  return headers;
}

async function requestBody(input: RequestInfo | URL, init: RequestInit): Promise<BodyInit | null | undefined> {
  if (init.body !== undefined) return init.body;
  if (typeof Request !== "undefined" && input instanceof Request && input.body) {
    return await input.clone().arrayBuffer();
  }
  return undefined;
}

export async function createEncryptedRequest(
  input: RequestInfo | URL,
  init: RequestInit = {},
  forcePublicKeyRefresh = false,
): Promise<PreparedTransportRequest> {
  const url = requestUrl(input);
  const method = requestMethod(input, init);
  const headers = mergeRequestHeaders(input, init);
  const nextInit: RequestInit = { ...init, method, headers };

  if (isPlaintextTransportEndpoint(url, method)) {
    return { init: nextInit, transport: null };
  }

  const publicKeyMetadata = await getTransportPublicKey(forcePublicKeyRefresh);
  const transportKey = await generateTransportRequestKey();
  const rsaPublicKey = await importTransportPublicKey(publicKeyMetadata.publicKey);
  const wrappedKey = await subtleCrypto().encrypt(
    { name: "RSA-OAEP" },
    rsaPublicKey,
    transportKey.rawKey,
  );
  headers.set("X-Transport-Key", `${publicKeyMetadata.keyId}.${encodeBase64Url(new Uint8Array(wrappedKey))}`);

  const aad = new TextEncoder().encode(`${method} ${url.pathname}`);
  const body = await requestBody(input, init);
  const contentType = headers.get("Content-Type") ?? "";
  const logicalPayload = await serializeTransportRequestBody(body, contentType);
  if (logicalPayload) {
    const encrypted = await encryptTransportBytes(
      new TextEncoder().encode(JSON.stringify(logicalPayload)),
      transportKey.aesKey,
      aad,
    );
    const envelope: EncryptedTransportEnvelope = {
      version: 1,
      algorithm: "A256GCM",
      keyId: publicKeyMetadata.keyId,
      ...encrypted,
    };
    nextInit.body = JSON.stringify(envelope);
    headers.set("Content-Type", "application/json");
  } else {
    delete nextInit.body;
  }

  return {
    init: nextInit,
    transport: {
      key: transportKey.aesKey,
      aad,
      keyId: publicKeyMetadata.keyId,
    },
  };
}

export function clearTransportPublicKeyCache(): void {
  cachedTransportPublicKey = null;
  publicKeyRequest = null;
}

export async function getTransportPublicKey(forceRefresh = false): Promise<TransportPublicKey> {
  if (forceRefresh) cachedTransportPublicKey = null;
  if (cachedTransportPublicKey) return cachedTransportPublicKey;
  if (!publicKeyRequest) {
    publicKeyRequest = globalThis.fetch(API_BASE_URL + "/transport/public-key", {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
    }).then(async (response) => {
      if (!response.ok) throw new Error("Failed to fetch transport public key");
      const value: unknown = await response.json();
      if (!isTransportPublicKey(value)) {
        throw new Error("Invalid transport public key");
      }
      cachedTransportPublicKey = value;
      return value;
    }).finally(() => {
      publicKeyRequest = null;
    });
  }
  return publicKeyRequest;
}
