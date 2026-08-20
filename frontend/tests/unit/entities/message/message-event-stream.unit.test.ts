import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import {
  openMessageEventStream,
  parseMessageEventStream,
  type UserChatStreamEvent,
} from "../../../../src/entities/message/api/message-event-stream";

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

test("opens the events endpoint with auth and treats unexpected EOF as reconnectable", async () => {
  const cleanup = installDom();
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const messages: string[] = [];

  try {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(streamFromChunks([
        "event: message\ndata: {\"id\":\"message-1\",\"sender_id\":\"sender-1\",\"recipient_id\":\"recipient-1\",\"content\":\"Hello\",\"created_at\":\"2026-08-20T12:00:00.000Z\"}\n\n",
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
    assert.deepEqual(messages, ["message-1"]);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});

test("notifies the app when the stream handshake returns 401", async () => {
  const cleanup = installDom();
  const originalFetch = globalThis.fetch;
  let expiredEvents = 0;
  window.addEventListener("meatlens:auth-expired", () => {
    expiredEvents += 1;
  });

  try {
    globalThis.fetch = (async () => new Response(null, { status: 401 })) as typeof globalThis.fetch;
    await assert.rejects(
      () => openMessageEventStream({
        signal: new AbortController().signal,
        onMessage: () => {},
        onStatus: () => {},
      }),
      /Session expired/,
    );
    assert.equal(expiredEvents, 1);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});
