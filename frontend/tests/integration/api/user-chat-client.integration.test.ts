import assert from "node:assert/strict";
import test from "node:test";

import { JSDOM } from "jsdom";

import { userChatClient } from "../../../src/entities/message";
import { SESSION_STORAGE_KEY, USER_STORAGE_KEY } from "../../../src/entities/user/model/session-cache-storage";
import { installEncryptedFetch } from "../../support/encrypted-fetch";

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousLocalStorage = globalThis.localStorage;
  const previousSessionStorage = globalThis.sessionStorage;

  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: dom.window.localStorage });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: dom.window.sessionStorage });

  return {
    cleanup: () => {
      Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
      Object.defineProperty(globalThis, "document", { configurable: true, value: previousDocument });
      Object.defineProperty(globalThis, "localStorage", { configurable: true, value: previousLocalStorage });
      Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: previousSessionStorage });
      dom.window.close();
    },
  };
}

function seedSession(): void {
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({
    id: "user-1",
    email: "inspector@example.com",
  }));
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    access_token: "session-token",
  }));
}

test("lists chat contacts with bearer authentication", async () => {
  const { cleanup } = installDom();
  let restoreTransportFetch = () => {};
  let capturedUrl = "";
  let authorization = "";

  try {
    seedSession();
    restoreTransportFetch = installEncryptedFetch(({ input, headers }) => {
      capturedUrl = String(input);
      authorization = headers.get("Authorization") ?? "";
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    await userChatClient.getContacts();

    assert.match(capturedUrl, /\/api\/user-chat\/contacts$/);
    assert.equal(authorization, "Bearer session-token");
  } finally {
    restoreTransportFetch();
    cleanup();
  }
});

test("posts chat message payload with recipient and content", async () => {
  const { cleanup } = installDom();
  let restoreTransportFetch = () => {};
  let requestBody = "";
  let authorization = "";

  try {
    seedSession();
    restoreTransportFetch = installEncryptedFetch(({ headers, logicalPayload }) => {
      requestBody = logicalPayload?.kind === "json" ? logicalPayload.value ?? "" : "";
      authorization = headers.get("Authorization") ?? "";
      return new Response(JSON.stringify({
        id: "msg-1",
        sender_id: "admin-1",
        recipient_id: "user-1",
        content: "Hello user.",
        created_at: "2026-05-17T08:00:00.000Z",
      }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });

    const message = await userChatClient.sendMessage("user-1", "Hello user.");

    assert.equal(authorization, "Bearer session-token");
    assert.match(requestBody, /"recipientId":"user-1"/);
    assert.match(requestBody, /"content":"Hello user\."/);
    assert.equal(message.recipient_id, "user-1");
  } finally {
    restoreTransportFetch();
    cleanup();
  }
});
