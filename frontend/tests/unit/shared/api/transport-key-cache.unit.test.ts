import assert from "node:assert/strict";
import test from "node:test";
import {
  clearTransportPublicKeyCache,
  getTransportPublicKey,
} from "../../../../src/shared/api/transport-crypto";

const PUBLIC_KEY = {
  version: 1 as const,
  algorithm: "RSA-OAEP-256" as const,
  keyId: "v1",
  publicKey: "AQIDBA",
};

test("transport public-key cache coalesces requests and never writes browser storage", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;

  try {
    clearTransportPublicKeyCache();
    globalThis.fetch = (async () => {
      fetchCount += 1;
      return new Response(JSON.stringify(PUBLIC_KEY), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;

    const [first, second] = await Promise.all([
      getTransportPublicKey(),
      getTransportPublicKey(),
    ]);

    assert.deepEqual(first, PUBLIC_KEY);
    assert.deepEqual(second, PUBLIC_KEY);
    assert.equal(fetchCount, 1);
  } finally {
    clearTransportPublicKeyCache();
    globalThis.fetch = originalFetch;
  }
});

test("transport public-key cache rejects malformed metadata", async () => {
  const originalFetch = globalThis.fetch;

  try {
    clearTransportPublicKeyCache();
    globalThis.fetch = (async () => new Response(JSON.stringify({
      version: 1,
      algorithm: "RSA-OAEP-256",
      keyId: "",
      publicKey: "bad",
    }), { status: 200 })) as typeof globalThis.fetch;

    await assert.rejects(() => getTransportPublicKey(), /invalid transport public key/i);
  } finally {
    clearTransportPublicKeyCache();
    globalThis.fetch = originalFetch;
  }
});
