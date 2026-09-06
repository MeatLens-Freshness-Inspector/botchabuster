import assert from "node:assert/strict";
import { constants, generateKeyPairSync, privateDecrypt, webcrypto } from "node:crypto";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import {
  MessageStreamConnectionError,
  openMessageEventStream,
  parseMessageEventStream,
  type UserChatStreamEvent,
} from "../../../../src/entities/message/api/message-event-stream";
import {
  clearApiTransportDiagnostics,
  getApiTransportDiagnostics,
} from "../../../../src/shared/api/api-transport-diagnostics";
import {
  clearTransportPublicKeyCache,
  encryptTransportBytes,
} from "../../../../src/shared/api/transport-crypto";

const encoder = new TextEncoder();

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousCustomEvent = globalThis.CustomEvent;
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "CustomEvent", { configurable: true, value: dom.window.CustomEvent });
  window.sessionStorage.setItem("meatlens-auth-session", JSON.stringify({ access_token: "session-token" }));
  return () => {
    Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
    Object.defineProperty(globalThis, "document", { configurable: true, value: previousDocument });
    Object.defineProperty(globalThis, "CustomEvent", { configurable: true, value: previousCustomEvent });
    dom.window.close();
  };
}

function transportPublicKeyResponse(publicKey: string): Response {
  return new Response(JSON.stringify({
    version: 1,
    algorithm: "RSA-OAEP-256",
    keyId: "test-v1",
    publicKey,
  }), { status: 200 });
}

test("parses fragmented CRLF frames, ignores heartbeats, and validates messages", async () => {
  const body = streamFromChunks([
    ": heart",
    "beat\r\n\r\nevent: status\r\ndata: {\"state\":\"connected\"}\r\n\r\n",
    "event: message\nid: message-1\ndata: {\"id\":\"message-1\",\"sender_id\":\"sender-1\",",
    "\"recipient_id\":\"recipient-1\",\"content\":\"Hello\",\"created_at\":\"2026-08-20T12:00:00.000Z\"}\n\n",
    "event: message\ndata: {\"id\":5}\n\n",
  ]);
  const events: UserChatStreamEvent[] = [];

  for await (const event of parseMessageEventStream(body)) events.push(event);

  assert.deepEqual(events, [
    { type: "status", state: "connected" },
    {
      type: "message",
      message: {
        id: "message-1",
        sender_id: "sender-1",
        recipient_id: "recipient-1",
        content: "Hello",
        created_at: "2026-08-20T12:00:00.000Z",
      },
    },
  ]);
});

test("preserves CRLF framing at every network chunk boundary", async () => {
  const frame = 'event: status\r\ndata: {"state":"connected"}\r\n\r\n';

  for (let splitAt = 1; splitAt < frame.length; splitAt += 1) {
    const events: UserChatStreamEvent[] = [];
    const body = streamFromChunks([frame.slice(0, splitAt), frame.slice(splitAt)]);
    for await (const event of parseMessageEventStream(body)) events.push(event);
    assert.deepEqual(events, [{ type: "status", state: "connected" }], `split at byte ${splitAt}`);
  }
});

test("opens the events endpoint with auth and treats unexpected EOF as reconnectable", async () => {
  const cleanup = installDom();
  const originalFetch = globalThis.fetch;
  const originalCrypto = globalThis.crypto;
  const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const publicKey = pair.publicKey.export({ type: "spki", format: "der" }).toString("base64url");
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const messages: string[] = [];

  try {
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
    clearTransportPublicKeyCache();
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedInit = init;
      if (capturedUrl.endsWith("/transport/public-key")) return transportPublicKeyResponse(publicKey);

      const transportHeader = new Headers(init?.headers).get("X-Transport-Key") ?? "";
      const wrappedKey = Buffer.from(transportHeader.slice(transportHeader.indexOf(".") + 1), "base64url");
      const rawKey = privateDecrypt({
        key: pair.privateKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      }, wrappedKey);
      const aesKey = await webcrypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["encrypt"]);
      const aad = new TextEncoder().encode("GET /api/user-chat/events");
      const plaintext = "event: message\ndata: {\"id\":\"message-1\",\"sender_id\":\"sender-1\",\"recipient_id\":\"recipient-1\",\"content\":\"Hello\",\"created_at\":\"2026-08-20T12:00:00.000Z\"}\n\n";
      const encrypted = await encryptTransportBytes(new TextEncoder().encode(plaintext), aesKey, aad);
      return new Response(streamFromChunks([
        `data: ${JSON.stringify({ version: 1, algorithm: "A256GCM", keyId: "test-v1", ...encrypted })}\n\n`,
      ]), { status: 200, headers: { "Content-Type": "text/event-stream" } });
    }) as typeof globalThis.fetch;

    await assert.rejects(
      () => openMessageEventStream({
        signal: new AbortController().signal,
        onMessage: (message) => messages.push(message.id),
        onStatus: () => {},
      }),
      /ended unexpectedly/,
    );

    const headers = new Headers(capturedInit?.headers);
    assert.match(capturedUrl, /\/api\/user-chat\/events$/);
    assert.equal(headers.get("Authorization"), "Bearer session-token");
    assert.equal(headers.get("Accept"), "text/event-stream");
    assert.equal(capturedInit?.credentials, "include");
    assert.equal(capturedInit?.cache, "no-store");
    assert.deepEqual(messages, ["message-1"]);
  } finally {
    clearTransportPublicKeyCache();
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: originalCrypto });
    cleanup();
  }
});

test("notifies the app when the stream handshake returns 401", async () => {
  const cleanup = installDom();
  const originalFetch = globalThis.fetch;
  const originalCrypto = globalThis.crypto;
  const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const publicKey = pair.publicKey.export({ type: "spki", format: "der" }).toString("base64url");
  let expiredEvents = 0;
  window.addEventListener("meatlens:auth-expired", () => {
    expiredEvents += 1;
  });

  try {
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
    clearTransportPublicKeyCache();
    globalThis.fetch = (async (input: RequestInfo | URL) => (
      String(input).endsWith("/transport/public-key")
        ? transportPublicKeyResponse(publicKey)
        : new Response(null, { status: 401 })
    )) as typeof globalThis.fetch;
    await assert.rejects(
      () => openMessageEventStream({
        signal: new AbortController().signal,
        onMessage: () => {},
        onStatus: () => {},
      }),
      (error: unknown) =>
        error instanceof MessageStreamConnectionError &&
        error.status === 401 &&
        error.retryable === false,
    );
    assert.equal(expiredEvents, 1);
  } finally {
    clearTransportPublicKeyCache();
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: originalCrypto });
    cleanup();
  }
});

test("records a stream handshake network failure for Android diagnostics", async () => {
  const cleanup = installDom();
  const originalFetch = globalThis.fetch;

  try {
    clearApiTransportDiagnostics();
    globalThis.fetch = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof globalThis.fetch;

    await assert.rejects(
      () => openMessageEventStream({
        signal: new AbortController().signal,
        onMessage: () => {},
        onStatus: () => {},
      }),
      /Failed to fetch/,
    );

    const [diagnostic] = getApiTransportDiagnostics();
    assert.equal(diagnostic?.stage, "network-error");
    assert.match(diagnostic?.url ?? "", /\/api\/user-chat\/events$/);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});
