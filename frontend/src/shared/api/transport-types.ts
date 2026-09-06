export const TRANSPORT_VERSION = 1 as const;
export const TRANSPORT_ALGORITHM = "A256GCM" as const;

export interface TransportPublicKey {
  version: typeof TRANSPORT_VERSION;
  algorithm: "RSA-OAEP-256";
  keyId: string;
  publicKey: string;
}

export interface TransportCiphertext {
  iv: string;
  ciphertext: string;
}

export interface EncryptedTransportEnvelope extends TransportCiphertext {
  version: typeof TRANSPORT_VERSION;
  algorithm: typeof TRANSPORT_ALGORITHM;
  keyId: string;
}

export interface TransportRequestPayload {
  kind: "json" | "bytes" | "form-data";
  contentType: string;
  value?: string;
  files?: Array<{
    fieldName: string;
    fileName: string;
    mimeType: string;
    size: number;
    bytes: string;
  }>;
}

export interface TransportResponsePayload {
  contentType: string;
  headers: Record<string, string>;
  body: string;
  bodyEncoding: "utf8" | "base64";
}
