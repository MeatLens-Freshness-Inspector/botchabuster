import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { authClient } from "../src/integrations/api/AuthClient";
import { uploadClient } from "../src/integrations/api/UploadClient";

type GlobalWithDom = typeof globalThis & {
  window: Window & typeof globalThis;
  document: Document;
  navigator: Navigator;
  HTMLElement: typeof HTMLElement;
};

const REQUEST_TIMEOUT_MESSAGE = "Request timed out. Please check your connection and try again.";

function installDom(): () => void {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });

  const previousGlobals = {
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
    HTMLElement: globalThis.HTMLElement,
  };

  const globals = globalThis as GlobalWithDom;
  Object.defineProperty(globals, "window", {
    configurable: true,
    value: dom.window as unknown as Window & typeof globalThis,
  });
  Object.defineProperty(globals, "document", {
    configurable: true,
    value: dom.window.document,
  });
  Object.defineProperty(globals, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });
  Object.defineProperty(globals, "HTMLElement", {
    configurable: true,
    value: dom.window.HTMLElement,
  });

  return () => {
    Object.defineProperty(globals, "window", {
      configurable: true,
      value: previousGlobals.window,
    });
    Object.defineProperty(globals, "document", {
      configurable: true,
      value: previousGlobals.document,
    });
    Object.defineProperty(globals, "navigator", {
      configurable: true,
      value: previousGlobals.navigator,
    });
    Object.defineProperty(globals, "HTMLElement", {
      configurable: true,
      value: previousGlobals.HTMLElement,
    });
    dom.window.close();
  };
}

function setStoredSession(accessToken = "session-token"): void {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.sessionStorage.setItem(
    "meatlens-auth-session",
    JSON.stringify({
      access_token: accessToken,
    }),
  );
}

function createJsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function createAbortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}

test("frontend API clients attach abort signals to representative requests", async () => {
  const restoreDom = installDom();
  const originalFetch = globalThis.fetch;

  try {
    setStoredSession();

    const capturedSignals: Array<AbortSignal | null | undefined> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedSignals.push(init?.signal);

      const url = String(input);
      if (url.includes("/auth/sign-in")) {
        return createJsonResponse({
          user: {
            id: "user-1",
            email: "inspector@example.com",
          },
          session: null,
        });
      }

      if (url.includes("/upload/inspection-image")) {
        return createJsonResponse({
          imageUrl: "https://example.com/uploaded.jpg",
        });
      }

      return createJsonResponse({});
    }) as typeof globalThis.fetch;

    await authClient.signIn("inspector@example.com", "secret-123");
    await authClient.updateEmail("user-1", "updated@example.com");
    await uploadClient.uploadInspectionImage(new File(["image"], "inspection.jpg", { type: "image/jpeg" }));

    assert.equal(capturedSignals.length, 3);
    for (const signal of capturedSignals) {
      assert.ok(signal instanceof AbortSignal);
      assert.equal(signal.aborted, false);
    }
  } finally {
    globalThis.fetch = originalFetch;
    restoreDom();
  }
});

test("AuthClient aborts stalled requests with a timeout error", async () => {
  const restoreDom = installDom();
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  const originalWindowSetTimeout = window.setTimeout.bind(window);

  try {
    setStoredSession();

    const fastSetTimeout = ((handler: TimerHandler, _timeout?: number, ...args: unknown[]) =>
      originalSetTimeout(handler as never, 1, ...(args as []))) as typeof globalThis.setTimeout;

    globalThis.setTimeout = fastSetTimeout;
    window.setTimeout = fastSetTimeout as typeof window.setTimeout;

    globalThis.fetch = ((_: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal;
      if (!(signal instanceof AbortSignal)) {
        return Promise.reject(new Error("Missing AbortSignal"));
      }

      return new Promise<Response>((_resolve, reject) => {
        if (signal.aborted) {
          reject(createAbortError());
          return;
        }

        signal.addEventListener(
          "abort",
          () => {
            reject(createAbortError());
          },
          { once: true },
        );
      });
    }) as typeof globalThis.fetch;

    await assert.rejects(
      () => authClient.updateEmail("user-1", "updated@example.com"),
      (error) => {
        assert.ok(error instanceof Error);
        assert.equal(error.message, REQUEST_TIMEOUT_MESSAGE);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
    window.setTimeout = originalWindowSetTimeout;
    restoreDom();
  }
});
