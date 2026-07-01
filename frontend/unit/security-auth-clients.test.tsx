import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { authClient } from "../src/integrations/api/AuthClient";
import { uploadClient } from "../src/integrations/api/UploadClient";
import { getChatRequestHeaders } from "../src/components/AIChatbot";

type GlobalWithDom = typeof globalThis & {
  window: Window & typeof globalThis;
  document: Document;
  navigator: Navigator;
  HTMLElement: typeof HTMLElement;
};

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
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    value: true,
  });
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

  Object.defineProperty(dom.window.HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: () => undefined,
  });

  return () => {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
      configurable: true,
      value: undefined,
    });
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
  window.localStorage.setItem(
    "meatlens-auth-session",
    JSON.stringify({
      access_token: accessToken,
    }),
  );
}

test("AuthClient sends the current bearer token for self-service email and password changes", async () => {
  const restoreDom = installDom();
  const originalFetch = globalThis.fetch;

  try {
    setStoredSession();

    const authorizations: string[] = [];
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      authorizations.push(new Headers(init?.headers).get("authorization") ?? "");

      if (String(_input).includes("/email")) {
        return new Response(
          JSON.stringify({
            id: "user-1",
            email: "updated@example.com",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }

      return new Response(null, { status: 204 });
    }) as typeof globalThis.fetch;

    await authClient.updateEmail("user-1", "updated@example.com");
    await authClient.updatePassword("user-1", "new-password-123");

    assert.deepEqual(authorizations, ["Bearer session-token", "Bearer session-token"]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreDom();
  }
});

test("UploadClient authenticates uploads and does not send a caller-controlled userId field", async () => {
  const restoreDom = installDom();
  const originalFetch = globalThis.fetch;

  try {
    setStoredSession();

    let authorization = "";
    let userIdValue: FormDataEntryValue | null = null;
    let hasImage = false;

    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      authorization = new Headers(init?.headers).get("authorization") ?? "";
      assert.ok(init?.body instanceof FormData);
      userIdValue = init.body.get("userId");
      hasImage = init.body.has("image");

      return new Response(
        JSON.stringify({
          imageUrl: "https://example.com/uploaded.jpg",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }) as typeof globalThis.fetch;

    const file = new File(["image-bytes"], "inspection.jpg", { type: "image/jpeg" });
    await uploadClient.uploadInspectionImage(file as File);

    assert.equal(authorization, "Bearer session-token");
    assert.equal(hasImage, true);
    assert.equal(userIdValue, null);
  } finally {
    globalThis.fetch = originalFetch;
    restoreDom();
  }
});

test("AIChatbot chat requests use the current bearer token", () => {
  const restoreDom = installDom();

  try {
    setStoredSession();
    assert.deepEqual(getChatRequestHeaders(), {
      "Content-Type": "application/json",
      Authorization: "Bearer session-token",
    });
  } finally {
    restoreDom();
  }
});
