import type { NextFunction, Request, RequestHandler, Response } from "express";
import {
  decodeBase64Url,
  decryptAesGcm,
  getTransportAad,
  parseEncryptedTransportEnvelope,
  unwrapAesKey,
} from "../modules/transport/infrastructure/TransportCrypto";
import type {
  DecodedTransportFile,
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

      if (req.body === undefined) {
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
