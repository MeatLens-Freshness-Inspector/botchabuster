import {
  constants,
  createCipheriv,
  createDecipheriv,
  generateKeyPairSync,
  privateDecrypt,
  randomBytes,
} from "node:crypto";
import type { Page, Request, Route } from "@playwright/test";

const TRANSPORT_VERSION = 1;
const TRANSPORT_ALGORITHM = "A256GCM";
const TRANSPORT_KEY_ID = "e2e-v1";

const transportKeyPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const transportPublicKey = transportKeyPair.publicKey.export({ type: "spki", format: "der" }).toString("base64url");

type RouteFulfillOptions = Parameters<Route["fulfill"]>[0];

interface TransportRequestPayload {
  kind: "json" | "bytes" | "form-data";
  contentType: string;
  value?: string;
  files?: unknown[];
}

interface EncryptedTransportEnvelope {
  version: number;
  algorithm: string;
  keyId: string;
  iv: string;
  ciphertext: string;
}

export interface DecryptedRouteRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  rawPostData: string;
  postData: string;
  logicalPayload: TransportRequestPayload | null;
}

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function encodeBase64Url(value: Uint8Array): string {
  return Buffer.from(value).toString("base64url");
}

function normalizeHeaders(value: RouteFulfillOptions["headers"]): Record<string, string> {
  if (!value) return {};
  if (Array.isArray(value)) return Object.fromEntries(value);
  if (value instanceof Headers) return Object.fromEntries(value.entries());
  return Object.fromEntries(Object.entries(value));
}

function unwrapRequestKey(request: Request): Buffer | null {
  const header = request.headers()["x-transport-key"];
  if (!header) return null;
  const separator = header.indexOf(".");
  if (separator <= 0 || header.slice(0, separator) !== TRANSPORT_KEY_ID) {
    throw new Error("Invalid E2E transport key header");
  }
  return privateDecrypt({
    key: transportKeyPair.privateKey,
    padding: constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: "sha256",
  }, decodeBase64Url(header.slice(separator + 1)));
}

function decryptRequestPayload(request: Request, rawPostData: string, rawKey: Buffer): TransportRequestPayload {
  const envelope = JSON.parse(rawPostData) as EncryptedTransportEnvelope;
  const ciphertextWithTag = decodeBase64Url(envelope.ciphertext);
  const url = new URL(request.url());
  const decipher = createDecipheriv("aes-256-gcm", rawKey, decodeBase64Url(envelope.iv));
  decipher.setAAD(Buffer.from(`${request.method()} ${url.pathname}`, "utf8"));
  decipher.setAuthTag(ciphertextWithTag.subarray(-16));
  const plaintext = Buffer.concat([
    decipher.update(ciphertextWithTag.subarray(0, -16)),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8")) as TransportRequestPayload;
}

function logicalPostData(payload: TransportRequestPayload): string {
  if (typeof payload.value !== "string") return "";
  if (payload.kind === "form-data") return payload.value || "{}";
  return payload.value;
}

export function decryptEncryptedRouteRequest(request: Request): DecryptedRouteRequest {
  const headers = request.headers();
  const rawPostData = request.postData() ?? "";
  if (!rawPostData) {
    return {
      method: request.method(),
      url: request.url(),
      headers,
      rawPostData,
      postData: "",
      logicalPayload: null,
    };
  }

  const rawKey = unwrapRequestKey(request);
  if (!rawKey) {
    return {
      method: request.method(),
      url: request.url(),
      headers,
      rawPostData,
      postData: rawPostData,
      logicalPayload: null,
    };
  }

  const logicalPayload = decryptRequestPayload(request, rawPostData, rawKey);
  return {
    method: request.method(),
    url: request.url(),
    headers,
    rawPostData,
    postData: logicalPostData(logicalPayload),
    logicalPayload,
  };
}

export function transportPublicKeyResponse(): RouteFulfillOptions {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      version: TRANSPORT_VERSION,
      algorithm: "RSA-OAEP-256",
      keyId: TRANSPORT_KEY_ID,
      publicKey: transportPublicKey,
    }),
  };
}

export async function mockTransportPublicKey(page: Page): Promise<void> {
  await page.route("**/api/transport/public-key", async (route) => {
    await route.fulfill(transportPublicKeyResponse());
  });
}

function responseBodyBytes(options: RouteFulfillOptions): Buffer {
  const record = options as RouteFulfillOptions & { json?: unknown };
  if (record.json !== undefined) return Buffer.from(JSON.stringify(record.json), "utf8");
  if (options.body === undefined) return Buffer.alloc(0);
  return Buffer.isBuffer(options.body) ? options.body : Buffer.from(options.body);
}

function responseContentType(options: RouteFulfillOptions, headers: Record<string, string>): string {
  return options.contentType ?? headers["content-type"] ?? "application/json; charset=utf-8";
}

export async function fulfillEncryptedRoute(route: Route, options: RouteFulfillOptions): Promise<void> {
  const request = route.request();
  const rawKey = unwrapRequestKey(request);
  if (!rawKey || options.status === 204 || options.status === 304) {
    await route.fulfill(options);
    return;
  }

  const headers = normalizeHeaders(options.headers);
  const contentType = responseContentType(options, headers);
  const bytes = responseBodyBytes(options);
  const bodyEncoding = contentType.toLowerCase().startsWith("application/json")
    || contentType.toLowerCase().startsWith("text/")
    ? "utf8"
    : "base64";
  const logicalBody = {
    contentType,
    headers: Object.fromEntries(
      Object.entries(headers).filter(([name]) => (
        !["content-type", "content-length", "content-encoding", "transfer-encoding"].includes(name.toLowerCase())
      )),
    ),
    body: bodyEncoding === "base64" ? encodeBase64Url(bytes) : bytes.toString("utf8"),
    bodyEncoding,
  } as const;
  const url = new URL(request.url());
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", rawKey, iv);
  cipher.setAAD(Buffer.from(`${request.method()} ${url.pathname}`, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(logicalBody), "utf8")),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  const outerHeaders = Object.fromEntries(
    Object.entries(headers).filter(([name]) => (
      !["content-type", "content-length", "content-encoding", "transfer-encoding"].includes(name.toLowerCase())
    )),
  );

  await route.fulfill({
    ...options,
    contentType: "application/json",
    headers: outerHeaders,
    body: JSON.stringify({
      version: TRANSPORT_VERSION,
      algorithm: TRANSPORT_ALGORITHM,
      keyId: TRANSPORT_KEY_ID,
      iv: encodeBase64Url(iv),
      ciphertext: encodeBase64Url(ciphertext),
    }),
  });
}
