import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";
import { clearTransportPublicKeyCache } from "../../../../src/shared/api/transport-crypto";
import { fetchWithTimeout } from "../../../../src/shared/api/fetch-with-timeout";

function encodeBase64Url(value: ArrayBuffer): string {
  return Buffer.from(value).toString("base64url");
}

test("shared fetch encrypts application bodies and bodyless requests", async () => {
  const originalFetch = globalThis.fetch;
  const originalCrypto = globalThis.crypto;
  const keyPair = await webcrypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"],
  ) as CryptoKeyPair;
  const publicKey = encodeBase64Url(await webcrypto.subtle.exportKey("spki", keyPair.publicKey));
  const calls: Array<{ input: string; init?: RequestInit }> = [];

  Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
  clearTransportPublicKeyCache();
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ input: url, init });
    if (url.endsWith("/transport/public-key")) {
      return new Response(JSON.stringify({
        version: 1,
        algorithm: "RSA-OAEP-256",
        keyId: "test-v1",
        publicKey,
      }), { status: 200 });
    }
    return new Response(null, { status: 204 });
  }) as typeof globalThis.fetch;

  try {
    await fetchWithTimeout("https://example.test/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: "must not be visible" }),
    });
    await fetchWithTimeout("https://example.test/api/profile", { method: "GET" });

    assert.equal(calls.length, 3);
    const applicationCalls = calls.filter((call) => !call.input.endsWith("/transport/public-key"));
    assert.equal(applicationCalls.length, 2);
    const encryptedBody = String(applicationCalls[0].init?.body);
    assert.doesNotMatch(encryptedBody, /must not be visible/);
    assert.ok(new Headers(applicationCalls[0].init?.headers).has("X-Transport-Key"));
    assert.ok(new Headers(applicationCalls[1].init?.headers).has("X-Transport-Key"));
    assert.equal(applicationCalls[1].init?.body, undefined);
  } finally {
    clearTransportPublicKeyCache();
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: originalCrypto });
  }
});
