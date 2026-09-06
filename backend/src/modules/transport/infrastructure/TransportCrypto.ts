import {
  createCipheriv,
  createDecipheriv,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
  constants,
  type KeyObject,
} from "node:crypto";
import {
  assertTransportEnvelope,
  TRANSPORT_ALGORITHM,
  TRANSPORT_VERSION,
  type EncryptedTransportEnvelope,
} from "../domain/transport";

const BASE64_URL_PATTERN = /^(?:[A-Za-z0-9_-]{2,})?$/;

export interface AesGcmCiphertext {
  iv: Buffer;
  ciphertext: Buffer;
  tag: Buffer;
}

export interface TransportEnvelopeLimits {
  expectedKeyId?: string;
  maxCiphertextBytes: number;
}

export function encodeBase64Url(value: Uint8Array): string {
  return Buffer.from(value)
    .toString("base64")
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
  const decoded = Buffer.from(padded, "base64");

  if (encodeBase64Url(decoded) !== value) {
    throw new Error("Invalid base64url value");
  }

  return new Uint8Array(decoded);
}

export function encryptAesGcm(
  plaintext: Uint8Array,
  key: Uint8Array,
  aad: Uint8Array,
): AesGcmCiphertext {
  if (key.length !== 32) {
    throw new Error("Transport AES key must be 32 bytes");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key), iv);
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);

  return {
    iv,
    ciphertext,
    tag: cipher.getAuthTag(),
  };
}

export function decryptAesGcm(
  encrypted: AesGcmCiphertext,
  key: Uint8Array,
  aad: Uint8Array,
): Buffer {
  if (key.length !== 32 || encrypted.iv.length !== 12 || encrypted.tag.length !== 16) {
    throw new Error("Transport decryption failed");
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from(key), encrypted.iv);
    decipher.setAAD(Buffer.from(aad));
    decipher.setAuthTag(encrypted.tag);
    return Buffer.concat([decipher.update(encrypted.ciphertext), decipher.final()]);
  } catch {
    throw new Error("Transport decryption failed");
  }
}

export function wrapAesKey(key: Uint8Array, publicKey: KeyObject): string {
  if (key.length !== 32) {
    throw new Error("Transport AES key must be 32 bytes");
  }

  try {
    return encodeBase64Url(new Uint8Array(publicEncrypt({
      key: publicKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    }, Buffer.from(key))));
  } catch {
    throw new Error("Transport key wrap failed");
  }
}

export function unwrapAesKey(wrappedKey: string, privateKey: KeyObject): Buffer {
  try {
    const key = privateDecrypt({
      key: privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    }, Buffer.from(decodeBase64Url(wrappedKey)));
    if (key.length !== 32) {
      throw new Error("wrong key length");
    }
    return key;
  } catch {
    throw new Error("Transport key unwrap failed");
  }
}

export function getTransportAad(method: string, path: string): Buffer {
  let pathname = path;
  try {
    pathname = new URL(path, "http://transport.invalid").pathname;
  } catch {
    pathname = path.split("?")[0] || "/";
  }
  return Buffer.from(method.toUpperCase() + " " + (pathname || "/"), "utf8");
}

export function createEncryptedTransportEnvelope(
  keyId: string,
  plaintext: Uint8Array,
  key: Uint8Array,
  aad: Uint8Array,
): EncryptedTransportEnvelope {
  const encrypted = encryptAesGcm(plaintext, key, aad);
  return {
    version: TRANSPORT_VERSION,
    algorithm: TRANSPORT_ALGORITHM,
    keyId,
    iv: encodeBase64Url(encrypted.iv),
    ciphertext: encodeBase64Url(Buffer.concat([encrypted.ciphertext, encrypted.tag])),
  };
}

export function parseEncryptedTransportEnvelope(
  value: unknown,
  limits: TransportEnvelopeLimits,
): AesGcmCiphertext & { keyId: string } {
  const envelope = assertTransportEnvelope(value);
  if (limits.expectedKeyId && envelope.keyId !== limits.expectedKeyId) {
    throw new Error("Transport envelope key ID is not accepted");
  }

  let iv: Uint8Array;
  let ciphertextWithTag: Uint8Array;
  try {
    iv = decodeBase64Url(envelope.iv);
    ciphertextWithTag = decodeBase64Url(envelope.ciphertext);
  } catch {
    throw new Error("Invalid encrypted transport envelope");
  }

  if (iv.length !== 12) {
    throw new Error("Transport envelope IV is invalid");
  }
  if (ciphertextWithTag.length > limits.maxCiphertextBytes) {
    throw new Error("Transport envelope exceeds the maximum size");
  }
  if (ciphertextWithTag.length < 16) {
    throw new Error("Transport envelope ciphertext is invalid");
  }

  return {
    keyId: envelope.keyId,
    iv: Buffer.from(iv),
    ciphertext: Buffer.from(ciphertextWithTag.slice(0, -16)),
    tag: Buffer.from(ciphertextWithTag.slice(-16)),
  };
}
