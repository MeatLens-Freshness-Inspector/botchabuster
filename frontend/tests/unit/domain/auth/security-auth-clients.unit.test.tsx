import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { authClient } from "../../../../src/features/auth/api/auth-client";
import { uploadClient } from "../../../../src/features/inspection-submission";
import { clearApiCsrfToken, setApiCsrfToken } from "../../../../src/shared/api/request";
import { getChatRequestHeaders } from "../../../../src/features/assistant";
import { installEncryptedFetch } from "../../../support/encrypted-fetch";

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
  window.sessionStorage.clear();
  window.sessionStorage.setItem(
    "meatlens-auth-session",
    JSON.stringify({
      access_token: accessToken,
    }),
  );
}

test("AuthClient reuses the cached bearer token alongside cookie credentials and in-memory csrf for self-service email and password changes", async () => {
  const restoreDom = installDom();
  let restoreTransportFetch = () => {};

  try {
    setStoredSession();
    setApiCsrfToken("csrf-1");

    const requests: Array<{
      authorization: string | null;
      credentials: RequestCredentials | undefined;
      csrf: string | null;
      body: string;
    }> = [];
    restoreTransportFetch = installEncryptedFetch(({ input, init, headers, logicalPayload }) => {
      requests.push({
        authorization: headers.get("authorization"),
        credentials: init?.credentials,
        csrf: headers.get("x-csrf-token"),
        body: logicalPayload?.kind === "json" ? logicalPayload.value ?? "" : "",
      });

      if (String(input).includes("/email")) {
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
    });

    await authClient.updateEmail("user-1", "updated@example.com");
    await authClient.updatePassword("user-1", "old-password", "new-password-123");

    assert.deepEqual(requests, [
      { authorization: "Bearer session-token", credentials: "include", csrf: "csrf-1", body: JSON.stringify({ email: "updated@example.com" }) },
      { authorization: "Bearer session-token", credentials: "include", csrf: "csrf-1", body: JSON.stringify({ currentPassword: "old-password", newPassword: "new-password-123" }) },
    ]);
  } finally {
    clearApiCsrfToken();
    restoreTransportFetch();
    restoreDom();
  }
});

test("UploadClient reuses the cached bearer token, sends csrf, and does not send a caller-controlled userId field", async () => {
  const restoreDom = installDom();
  let restoreTransportFetch = () => {};

  try {
    setStoredSession();
    setApiCsrfToken("csrf-upload");

    let authorization: string | null = null;
    let csrf: string | null = null;
    let credentials: RequestCredentials | undefined;
    let userIdValue: FormDataEntryValue | null = null;
    let hasImage = false;

    restoreTransportFetch = installEncryptedFetch(({ headers, init, logicalPayload }) => {
      authorization = headers.get("authorization");
      csrf = headers.get("x-csrf-token");
      credentials = init?.credentials;
      const files = logicalPayload?.kind === "form-data" ? logicalPayload.files ?? [] : [];
      const fields = logicalPayload?.kind === "form-data" && logicalPayload.value
        ? JSON.parse(logicalPayload.value) as Record<string, unknown>
        : {};
      userIdValue = typeof fields.userId === "string" ? fields.userId : null;
      hasImage = files.some((file) => file.fieldName === "image");

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
    });

    const file = new File(["image-bytes"], "inspection.jpg", { type: "image/jpeg" });
    await uploadClient.uploadInspectionImage(file as File);

    assert.equal(authorization, "Bearer session-token");
    assert.equal(csrf, "csrf-upload");
    assert.equal(credentials, "include");
    assert.equal(hasImage, true);
    assert.equal(userIdValue, null);
  } finally {
    clearApiCsrfToken();
    restoreTransportFetch();
    restoreDom();
  }
});

test("AIChatbot chat requests omit bearer headers and reuse the in-memory csrf token", () => {
  const restoreDom = installDom();

  try {
    setStoredSession();
    setApiCsrfToken("csrf-chat");
    assert.equal(window.localStorage.getItem("meatlens-auth-session"), null);
    assert.equal(window.sessionStorage.getItem("meatlens-auth-session") !== null, true);
    assert.deepEqual(getChatRequestHeaders(), {
      "Content-Type": "application/json",
      "X-CSRF-Token": "csrf-chat",
    });
  } finally {
    clearApiCsrfToken();
    restoreDom();
  }
});
