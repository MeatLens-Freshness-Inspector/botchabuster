import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import {
  API_TRANSPORT_DIAGNOSTICS_STORAGE_KEY,
  clearApiTransportDiagnostics,
  formatApiTransportDiagnostics,
  getApiTransportDiagnostics,
  recordApiTransportFailure,
} from "../../../src/shared/api/api-transport-diagnostics";
import { API_BASE_URL } from "../../../src/shared/api/base-url";
import { fetchWithTimeout } from "../../../src/shared/api/fetch-with-timeout";
import { installEncryptedFetch } from "../../support/encrypted-fetch";

type GlobalWithDom = typeof globalThis & {
  window: Window & typeof globalThis;
  navigator: Navigator;
};

function installDom(): () => void {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://localhost/",
  });

  const previousGlobals = {
    window: globalThis.window,
    navigator: globalThis.navigator,
  };

  const globals = globalThis as GlobalWithDom;
  Object.defineProperty(globals, "window", {
    configurable: true,
    value: dom.window as unknown as Window & typeof globalThis,
  });
  Object.defineProperty(globals, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });

  return () => {
    Object.defineProperty(globals, "window", {
      configurable: true,
      value: previousGlobals.window,
    });
    Object.defineProperty(globals, "navigator", {
      configurable: true,
      value: previousGlobals.navigator,
    });
    dom.window.close();
  };
}

test("persists a readable API failure without leaking credentials or request data", () => {
  const restoreDom = installDom();

  try {
    clearApiTransportDiagnostics();

    recordApiTransportFailure({
      input: "https://meatlens-backend.onrender.com/api/auth/sign-in?email=inspector@example.com",
      init: {
        method: "POST",
        headers: {
          Authorization: "Bearer access-token",
          "X-CSRF-Token": "csrf-token",
        },
        body: JSON.stringify({ password: "super-secret" }),
      },
      error: new TypeError("Failed to fetch"),
    });

    const diagnostics = getApiTransportDiagnostics();
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].stage, "network-error");
    assert.equal(
      diagnostics[0].url,
      "https://meatlens-backend.onrender.com/api/auth/sign-in",
    );
    assert.equal(diagnostics[0].appOrigin, "https://localhost");
    assert.equal(diagnostics[0].method, "POST");
    assert.equal(diagnostics[0].errorMessage, "Failed to fetch");

    const storedValue = window.sessionStorage.getItem(API_TRANSPORT_DIAGNOSTICS_STORAGE_KEY) ?? "";
    const formatted = formatApiTransportDiagnostics();
    assert.doesNotMatch(storedValue, /access-token|csrf-token|super-secret|inspector@example.com/);
    assert.match(formatted, /network-error/);
    assert.match(formatted, /https:\/\/meatlens-backend\.onrender\.com\/api\/auth\/sign-in/);
    assert.match(formatted, /Failed to fetch/);
  } finally {
    restoreDom();
  }
});

test("records a failed fetch from the shared request wrapper", async () => {
  const restoreDom = installDom();
  const originalFetch = globalThis.fetch;

  try {
    clearApiTransportDiagnostics();
    globalThis.fetch = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof globalThis.fetch;

    await assert.rejects(
      () => fetchWithTimeout("https://meatlens-backend.onrender.com/api/health"),
      /Failed to fetch/,
    );

    const [diagnostic] = getApiTransportDiagnostics();
    assert.equal(diagnostic?.stage, "network-error");
    assert.equal(diagnostic?.url, "https://meatlens-backend.onrender.com/api/health");
  } finally {
    globalThis.fetch = originalFetch;
    restoreDom();
  }
});

test("records failed HTTP responses from the shared request wrapper", async () => {
  const restoreDom = installDom();
  const restoreTransportFetch = installEncryptedFetch(() =>
    new Response(null, { status: 503, statusText: "Service Unavailable" }),
  );

  try {
    clearApiTransportDiagnostics();

    const response = await fetchWithTimeout("https://meatlens-backend.onrender.com/api/health");

    assert.equal(response.status, 503);
    const [diagnostic] = getApiTransportDiagnostics();
    assert.equal(diagnostic?.stage, "http-error");
    assert.equal(diagnostic?.status, 503);
    assert.equal(diagnostic?.statusText, "Service Unavailable");
  } finally {
    restoreTransportFetch();
    restoreDom();
  }
});

test("does not diagnose the expected anonymous auth session response", async () => {
  const restoreDom = installDom();
  const restoreTransportFetch = installEncryptedFetch(() => (
    new Response(null, { status: 401, statusText: "Unauthorized" })
  ));

  try {
    clearApiTransportDiagnostics();

    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/session`);

    assert.equal(response.status, 401);
    assert.deepEqual(getApiTransportDiagnostics(), []);
  } finally {
    restoreTransportFetch();
    restoreDom();
  }
});

test("continues diagnosing unauthorized responses from protected endpoints", async () => {
  const restoreDom = installDom();
  const restoreTransportFetch = installEncryptedFetch(() => (
    new Response(null, { status: 401, statusText: "Unauthorized" })
  ));

  try {
    clearApiTransportDiagnostics();

    const response = await fetchWithTimeout(`${API_BASE_URL}/profiles`);

    assert.equal(response.status, 401);
    const [diagnostic] = getApiTransportDiagnostics();
    assert.equal(diagnostic?.stage, "http-error");
    assert.equal(diagnostic?.status, 401);
    assert.equal(diagnostic?.url, `${API_BASE_URL}/profiles`);
  } finally {
    restoreTransportFetch();
    restoreDom();
  }
});
