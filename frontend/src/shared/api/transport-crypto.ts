import type { TransportCiphertext } from "./transport-types";

export interface GeneratedTransportKey {
  aesKey: CryptoKey;
  rawKey: Uint8Array;
}

const BASE64_URL_PATTERN = /^(?:[A-Za-z0-9_-]{2,})?$/;

function subtleCrypto(): SubtleCrypto {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle) {
    throw new Error("Web Crypto API is unavailable");
  }
  return cryptoApi.subtle;
}

function encodeBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array {
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
