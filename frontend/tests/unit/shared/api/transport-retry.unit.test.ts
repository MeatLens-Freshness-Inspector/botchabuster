import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";
import { fetchWithTimeout } from "../../../../src/shared/api/fetch-with-timeout";
import {
  clearTransportPublicKeyCache,
} from "../../../../src/shared/api/transport-crypto";

function encodeBase64Url(value: ArrayBuffer): string {
  return Buffer.from(value).toString("base64url");
}

test("refreshes the transport public key once after response decryption failure", async () => {
  const originalFetch = globalThis.fetch;
  const originalCrypto = globalThis.crypto;
  const oldPair = await webcrypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"],
  ) as CryptoKeyPair;
  const newPair = await webcrypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"],
  ) as CryptoKeyPair;
  const publicKeys = [
    encodeBase64Url(await webcrypto.subtle.exportKey("spki", oldPair.publicKey)),
    encodeBase64Url(await webcrypto.subtle.exportKey("spki", newPair.publicKey)),
  ];
  let keyFetches = 0;
  let applicationFetches = 0;

  Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
  clearTransportPublicKeyCache();
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).endsWith("/transport/public-key")) {
      const publicKey = publicKeys[Math.min(keyFetches++, publicKeys.length - 1)];
      return new Response(JSON.stringify({ version: 1, algorithm: "RSA-OAEP-256", keyId: "test-v1", publicKey }), { status: 200 });
    }
    applicationFetches += 1;
    return applicationFetches === 1
      ? new Response("not encrypted", { status: 200 })
      : new Response(null, { status: 204 });
  }) as typeof globalThis.fetch;

  try {
    const response = await fetchWithTimeout("https://example.test/api/profile");
    assert.equal(response.status, 204);
    assert.equal(applicationFetches, 2);
    assert.equal(keyFetches, 2);
  } finally {
    clearTransportPublicKeyCache();
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: originalCrypto });
  }
});

test("stops after one transport-key refresh", async () => {
  const originalFetch = globalThis.fetch;
  const originalCrypto = globalThis.crypto;
  const keyPair = await webcrypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"],
  ) as CryptoKeyPair;
  const publicKey = encodeBase64Url(await webcrypto.subtle.exportKey("spki", keyPair.publicKey));
  let keyFetches = 0;
  let applicationFetches = 0;

  Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
  clearTransportPublicKeyCache();
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).endsWith("/transport/public-key")) {
      keyFetches += 1;
      return new Response(JSON.stringify({ version: 1, algorithm: "RSA-OAEP-256", keyId: "test-v1", publicKey }), { status: 200 });
    }
    applicationFetches += 1;
    return new Response("still not encrypted", { status: 200 });
  }) as typeof globalThis.fetch;

  try {
    await assert.rejects(() => fetchWithTimeout("https://example.test/api/profile"), /Invalid encrypted response/);
    assert.equal(applicationFetches, 2);
    assert.equal(keyFetches, 2);
  } finally {
    clearTransportPublicKeyCache();
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: originalCrypto });
  }
});
