import assert from "node:assert/strict";
import {
  constants,
  generateKeyPairSync,
  privateDecrypt,
  webcrypto,
} from "node:crypto";
import test from "node:test";
import {
  clearTransportPublicKeyCache,
  encryptTransportBytes,
} from "../../../src/shared/api/transport-crypto";
import { openMessageEventStream } from "../../../src/entities/message/api/message-event-stream";

test("live-message consumer receives events after transport stream decryption", async () => {
  const originalFetch = globalThis.fetch;
  const originalCrypto = globalThis.crypto;
  const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const publicKey = pair.publicKey.export({ type: "spki", format: "der" }).toString("base64url");
  const inner = [
    "event: status\ndata: {\"state\":\"connected\"}\n\n",
    "event: message\ndata: {\"id\":\"message-1\",\"sender_id\":\"sender-1\",\"recipient_id\":\"recipient-1\",\"content\":\"fresh\",\"created_at\":\"2026-09-06T00:00:00.000Z\"}\n\n",
  ];

  Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
  clearTransportPublicKeyCache();
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith("/transport/public-key")) {
      return new Response(JSON.stringify({ version: 1, algorithm: "RSA-OAEP-256", keyId: "test-v1", publicKey }), { status: 200 });
    }

    const header = new Headers(init?.headers).get("X-Transport-Key") ?? "";
    const wrappedKey = Buffer.from(header.slice(header.indexOf(".") + 1), "base64url");
    const rawKey = privateDecrypt({
      key: pair.privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    }, wrappedKey);
    const aesKey = await webcrypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
    const aad = new TextEncoder().encode("GET /api/user-chat/events");
    const outerFrames: string[] = [];
    for (const chunk of inner) {
      const encrypted = await encryptTransportBytes(new TextEncoder().encode(chunk), aesKey, aad);
      outerFrames.push(`data: ${JSON.stringify({ version: 1, algorithm: "A256GCM", keyId: "test-v1", ...encrypted })}\n\n`);
    }
    return new Response(outerFrames.join(""), {
      status: 200,
      headers: { "Content-Type": "text/event-stream; charset=utf-8" },
    });
  }) as typeof globalThis.fetch;

  const messages: string[] = [];
  const statuses: string[] = [];
  try {
    await assert.rejects(
      () => openMessageEventStream({
        signal: new AbortController().signal,
        onMessage: (message) => messages.push(message.content),
        onStatus: (status) => statuses.push(status),
      }),
      /ended unexpectedly/,
    );
    assert.deepEqual(statuses, ["connected"]);
    assert.deepEqual(messages, ["fresh"]);
  } finally {
    clearTransportPublicKeyCache();
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: originalCrypto });
  }
});
