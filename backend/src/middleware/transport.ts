import type { NextFunction, Request, RequestHandler, Response } from "express";
import {
  decodeBase64Url,
  createEncryptedTransportEnvelope,
  decryptAesGcm,
  getTransportAad,
  parseEncryptedTransportEnvelope,
  unwrapAesKey,
} from "../modules/transport/infrastructure/TransportCrypto";
import type {
  DecodedTransportFile,
  TransportResponsePayload,
  TransportRequestPayload,
} from "../modules/transport/domain/transport";
import type { TransportKeyStore } from "../modules/transport/infrastructure/TransportKeyStore";

export const TRANSPORT_KEY_HEADER = "X-Transport-Key";

export interface TransportMiddlewareOptions {
  maxPayloadBytes: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectRequest(res: Response): void {
  res.status(400).json({ error: "Invalid encrypted request" });
}

function headerValueToString(value: string | number | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value.join(", ") : String(value);
}

function collectLogicalResponseHeaders(res: Response): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(res.getHeaders())) {
    const lowerName = name.toLowerCase();
    if (
      lowerName === "content-type"
      || lowerName === "content-length"
      || lowerName === "content-encoding"
      || lowerName === "transfer-encoding"
      || lowerName === "set-cookie"
    ) {
      continue;
    }
    const stringValue = headerValueToString(value);
    if (stringValue !== undefined) headers[lowerName] = stringValue;
  }
  return headers;
}

function responseBodyBytes(chunk: unknown, encoding?: BufferEncoding): Buffer {
  if (Buffer.isBuffer(chunk)) return chunk;
  if (chunk instanceof Uint8Array) return Buffer.from(chunk);
  if (typeof chunk === "string") return Buffer.from(chunk, encoding);
  if (chunk === undefined || chunk === null) return Buffer.alloc(0);
  return Buffer.from(JSON.stringify(chunk));
}

function installResponseEncryption(res: Response, context: NonNullable<Request["transportContext"]>): void {
  const originalEnd = res.end.bind(res);
  const originalWrite = res.write.bind(res);
  let responseFinalized = false;

  const setWireResponseHeaders = (contentType: string): void => {
    if (res.headersSent) return;
    res.removeHeader("Content-Length");
    res.removeHeader("Content-Encoding");
    res.removeHeader("Transfer-Encoding");
    res.setHeader("Content-Type", contentType);
  };

  const writeEncryptedStreamChunk = (chunk: unknown, encoding?: BufferEncoding): boolean => {
    const plaintext = responseBodyBytes(chunk, encoding);
    if (plaintext.length === 0) return true;
    const envelope = createEncryptedTransportEnvelope(
      context.keyId,
      plaintext,
      context.aesKey,
      context.aad,
    );
    return originalWrite(`data: ${JSON.stringify(envelope)}\n\n`);
  };

  const emitEncryptedResponse = (
    body: Buffer,
    contentType: string,
    bodyEncoding: TransportResponsePayload["bodyEncoding"],
  ): Response => {
    if (responseFinalized) return res;
    responseFinalized = true;
    const logicalPayload: TransportResponsePayload = {
      contentType,
      headers: collectLogicalResponseHeaders(res),
      body: bodyEncoding === "base64" ? body.toString("base64url") : body.toString("utf8"),
      bodyEncoding,
    };
    const envelope = createEncryptedTransportEnvelope(
      context.keyId,
      Buffer.from(JSON.stringify(logicalPayload), "utf8"),
      context.aesKey,
      context.aad,
    );
    setWireResponseHeaders("application/json; charset=utf-8");
    originalEnd(JSON.stringify(envelope));
    return res;
  };

  res.json = ((value: unknown): Response => {
    const body = Buffer.from(JSON.stringify(value === undefined ? null : value), "utf8");
    const contentType = headerValueToString(res.getHeader("Content-Type"))
      ?? "application/json; charset=utf-8";
    return emitEncryptedResponse(body, contentType, "utf8");
  }) as Response["json"];

  res.send = ((body?: unknown): Response => {
    const bytes = responseBodyBytes(body);
    const isBinary = Buffer.isBuffer(body) || body instanceof Uint8Array;
    const contentType = headerValueToString(res.getHeader("Content-Type"))
      ?? (isBinary ? "application/octet-stream" : "application/json; charset=utf-8");
    return emitEncryptedResponse(bytes, contentType, isBinary ? "base64" : "utf8");
  }) as Response["send"];

  res.write = ((chunk: unknown, encoding?: BufferEncoding): boolean => {
    const contentType = headerValueToString(res.getHeader("Content-Type")) ?? "";
    if (!contentType.toLowerCase().startsWith("text/event-stream")) {
      return originalWrite(chunk as never, encoding as never);
    }
    context.isStream = true;
    setWireResponseHeaders("text/event-stream; charset=utf-8");
    return writeEncryptedStreamChunk(chunk, encoding);
  }) as Response["write"];

  res.end = ((chunk?: unknown, encoding?: BufferEncoding): Response => {
    if (context.isStream || headerValueToString(res.getHeader("Content-Type"))?.toLowerCase().startsWith("text/event-stream")) {
      context.isStream = true;
      setWireResponseHeaders("text/event-stream; charset=utf-8");
      if (chunk !== undefined && responseBodyBytes(chunk, encoding).length > 0) {
        writeEncryptedStreamChunk(chunk, encoding);
      }
      if (!responseFinalized) {
        responseFinalized = true;
        originalEnd();
      }
      return res;
    }

    const body = responseBodyBytes(chunk, encoding);
    const contentType = headerValueToString(res.getHeader("Content-Type"))
      ?? "application/octet-stream";
    return emitEncryptedResponse(body, contentType, Buffer.isBuffer(chunk) ? "base64" : "utf8");
  }) as Response["end"];
}

export function isTransportPlaintextEndpoint(req: Request): boolean {
  return req.method.toUpperCase() === "GET"
    && (req.path === "/api/analysis/health" || req.path === "/api/transport/public-key");
}

function readTransportKeyHeader(value: string, keyStore: TransportKeyStore): Buffer {
  const separator = value.indexOf(".");
  if (separator <= 0 || separator === value.length - 1) {
    throw new Error("Invalid transport key header");
  }
  const keyId = value.slice(0, separator);
  if (keyId !== keyStore.keyId) {
    throw new Error("Invalid transport key header");
  }
  return unwrapAesKey(value.slice(separator + 1), keyStore.privateKey);
}

function readRequestPayload(value: unknown): TransportRequestPayload {
  if (!isRecord(value)) throw new Error("Invalid request payload");
  if (
    (value.kind !== "json" && value.kind !== "bytes" && value.kind !== "form-data")
    || typeof value.contentType !== "string"
    || value.contentType.length > 256
  ) {
    throw new Error("Invalid request payload");
  }

  const payload: TransportRequestPayload = {
    kind: value.kind,
    contentType: value.contentType,
  };
  if (value.value !== undefined) {
    if (typeof value.value !== "string") throw new Error("Invalid request payload");
    payload.value = value.value;
  }
  if (value.files !== undefined) {
    if (!Array.isArray(value.files)) throw new Error("Invalid request payload");
    payload.files = value.files as TransportRequestPayload["files"];
  }
  return payload;
}

function applyLogicalRequestPayload(req: Request, payload: TransportRequestPayload, maxPayloadBytes: number): void {
  if (payload.kind === "json") {
    if (typeof payload.value !== "string") throw new Error("Invalid request payload");
    req.body = JSON.parse(payload.value) as unknown;
    return;
  }

  if (payload.kind === "bytes") {
    if (typeof payload.value !== "string") throw new Error("Invalid request payload");
    const bytes = Buffer.from(decodeBase64Url(payload.value));
    if (bytes.length > maxPayloadBytes) throw new Error("Request payload is too large");
    req.transportBody = bytes;
    req.body = bytes;
    return;
  }

  const fields = payload.value ? JSON.parse(payload.value) as unknown : {};
  if (!isRecord(fields) || Object.values(fields).some((value) => typeof value !== "string")) {
    throw new Error("Invalid request payload");
  }

  const files: Record<string, DecodedTransportFile> = {};
  for (const file of payload.files ?? []) {
    if (
      !isRecord(file)
      || typeof file.fieldName !== "string"
      || typeof file.fileName !== "string"
      || typeof file.mimeType !== "string"
      || typeof file.size !== "number"
      || typeof file.bytes !== "string"
      || file.fieldName.length === 0
      || file.fileName.length === 0
      || file.mimeType.length === 0
      || !Number.isSafeInteger(file.size)
      || file.size < 0
    ) {
      throw new Error("Invalid request payload");
    }
    const bytes = Buffer.from(decodeBase64Url(file.bytes));
    if (bytes.length !== file.size || bytes.length > maxPayloadBytes) {
      throw new Error("Request payload is too large");
    }
    files[file.fieldName] = {
      fieldName: file.fieldName,
      fileName: file.fileName,
      mimeType: file.mimeType,
      size: file.size,
      bytes,
    };
  }

  req.body = fields;
  req.transportFiles = files;
}

export function createTransportMiddleware(
  keyStore: TransportKeyStore,
  options: TransportMiddlewareOptions,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (isTransportPlaintextEndpoint(req)) {
      next();
      return;
    }

    const header = req.header(TRANSPORT_KEY_HEADER);
    if (!header) {
      rejectRequest(res);
      return;
    }

    try {
      const aesKey = readTransportKeyHeader(header, keyStore);
      const aad = getTransportAad(req.method, req.path);
      req.transportContext = {
        keyId: keyStore.keyId,
        aesKey,
        aad,
        isStream: false,
      };
      installResponseEncryption(res, req.transportContext);

      const contentLength = req.header("content-length");
      const hasRequestBody = req.body !== undefined && (
        contentLength === undefined
          ? req.headers["transfer-encoding"] !== undefined
          : Number(contentLength) > 0
      );
      if (!hasRequestBody) {
        next();
        return;
      }

      const encrypted = parseEncryptedTransportEnvelope(req.body, {
        expectedKeyId: keyStore.keyId,
        maxCiphertextBytes: options.maxPayloadBytes + 1024,
      });
      const plaintext = decryptAesGcm(encrypted, aesKey, aad);
      if (plaintext.length > options.maxPayloadBytes) {
        throw new Error("Request payload is too large");
      }
      const logicalPayload = readRequestPayload(JSON.parse(plaintext.toString("utf8")) as unknown);
      applyLogicalRequestPayload(req, logicalPayload, options.maxPayloadBytes);
      next();
    } catch {
      rejectRequest(res);
    }
  };
}
