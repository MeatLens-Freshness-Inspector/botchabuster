export const TRANSPORT_VERSION = 1 as const;
export const TRANSPORT_ALGORITHM = "A256GCM" as const;

export type TransportVersion = typeof TRANSPORT_VERSION;
export type TransportAlgorithm = typeof TRANSPORT_ALGORITHM;

export interface EncryptedTransportEnvelope {
  version: TransportVersion;
  algorithm: TransportAlgorithm;
  keyId: string;
  iv: string;
  ciphertext: string;
}

export interface TransportPublicKey {
  version: TransportVersion;
  algorithm: "RSA-OAEP-256";
  keyId: string;
  publicKey: string;
}

export interface TransportFile {
  fieldName: string;
  fileName: string;
  mimeType: string;
  size: number;
  bytes: string;
}

export interface TransportRequestPayload {
  kind: "json" | "bytes" | "form-data";
  contentType: string;
  value?: string;
  files?: TransportFile[];
}

export interface TransportResponsePayload {
  contentType: string;
  headers: Record<string, string>;
  body: string;
  bodyEncoding: "utf8" | "base64";
}

export interface TransportContext {
  keyId: string;
  aesKey: Buffer;
  aad: Buffer;
  isStream: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assertTransportEnvelope(value: unknown): EncryptedTransportEnvelope {
  if (
    !isRecord(value)
    || value.version !== TRANSPORT_VERSION
    || value.algorithm !== TRANSPORT_ALGORITHM
    || typeof value.keyId !== "string"
    || value.keyId.trim().length === 0
    || typeof value.iv !== "string"
    || value.iv.length === 0
    || typeof value.ciphertext !== "string"
    || value.ciphertext.length === 0
  ) {
    throw new Error("Invalid encrypted transport envelope");
  }

  return {
    version: TRANSPORT_VERSION,
    algorithm: TRANSPORT_ALGORITHM,
    keyId: value.keyId,
    iv: value.iv,
    ciphertext: value.ciphertext,
  };
}
