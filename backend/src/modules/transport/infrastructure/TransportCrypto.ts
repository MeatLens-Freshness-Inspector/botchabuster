import {
  createCipheriv,
  createDecipheriv,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
  constants,
  type KeyObject,
} from "node:crypto";

const BASE64_URL_PATTERN = /^(?:[A-Za-z0-9_-]{2,})?$/;

export interface AesGcmCiphertext {
  iv: Buffer;
  ciphertext: Buffer;
  tag: Buffer;
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
