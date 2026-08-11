import assert from "node:assert/strict";
import test from "node:test";

import { JSDOM } from "jsdom";

import { AUTH_EXPIRED_EVENT } from "../../../src/shared/api/request";
import { inspectionClient } from "../../../src/integrations/api/InspectionClient";
import { SESSION_STORAGE_KEY, USER_STORAGE_KEY } from "../../../src/entities/user/model/session-cache-storage";

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousLocalStorage = globalThis.localStorage;
  const previousSessionStorage = globalThis.sessionStorage;
  const previousCustomEvent = globalThis.CustomEvent;

  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: dom.window.localStorage });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: dom.window.sessionStorage });
  Object.defineProperty(globalThis, "CustomEvent", { configurable: true, value: dom.window.CustomEvent });

  return {
    cleanup: () => {
      Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
      Object.defineProperty(globalThis, "document", { configurable: true, value: previousDocument });
      Object.defineProperty(globalThis, "localStorage", { configurable: true, value: previousLocalStorage });
      Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: previousSessionStorage });
      Object.defineProperty(globalThis, "CustomEvent", { configurable: true, value: previousCustomEvent });
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

test("sends bearer auth and scopes inspection list requests to the signed-in user by default", async () => {
  const { cleanup } = installDom();
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let authorization = "";

  try {
    seedSession();
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      authorization = new Headers(init?.headers).get("Authorization") ?? "";
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;

    await inspectionClient.getAll(25, 5);

    assert.match(capturedUrl, /\/api\/inspections\?limit=25&offset=5&scope=mine$/);
    assert.equal(authorization, "Bearer session-token");
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});

test("allows callers to request the full inspection dataset explicitly", async () => {
  const { cleanup } = installDom();
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";

  try {
    seedSession();
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      capturedUrl = String(input);
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;

    await inspectionClient.getAll(200, 0, "all");

    assert.match(capturedUrl, /\/api\/inspections\?limit=200&offset=0&scope=all$/);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});

test("emits auth-expired and throws a re-login error when inspection requests return unauthorized", async () => {
  const { cleanup } = installDom();
  const originalFetch = globalThis.fetch;
  let authExpiredEvents = 0;

  try {
    seedSession();
    window.addEventListener(AUTH_EXPIRED_EVENT, () => {
      authExpiredEvents += 1;
    });
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: "Invalid or expired access token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })) as typeof globalThis.fetch;

    await assert.rejects(
      () => inspectionClient.getAll(),
      /Session expired\. Please sign in again\./,
    );
    assert.equal(authExpiredEvents, 1);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});
