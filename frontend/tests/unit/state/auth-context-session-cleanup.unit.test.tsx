import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { indexedDB as fakeIndexedDb } from "fake-indexeddb";
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AuthProvider, useAuth } from "../../../src/contexts/AuthContext";
import { authClient } from "../../../src/integrations/api/AuthClient";
import {
  clearApiCsrfToken,
  refreshApiSessionForCsrf,
} from "../../../src/shared/api/request";
import {
  clearOfflineAuthEnvelope,
  loadOfflineAuthEnvelope,
} from "../../../src/lib/offlineAuthEnvelope";

type GlobalWithDom = typeof globalThis & {
  window: Window & typeof globalThis;
  document: Document;
  navigator: Navigator;
  HTMLElement: typeof HTMLElement;
};

type AuthProbeState = ReturnType<typeof useAuth>;

const originalIndexedDb = globalThis.indexedDB;

function createBootstrapPayload() {
  return {
    user: {
      id: "user-1",
      email: "inspector@example.com",
    },
    profile: {
      id: "user-1",
      full_name: "Inspector Example",
      avatar_url: null,
      inspector_code: "INS-123",
      report_organization: "dti" as const,
      is_dark_mode: false,
      show_detailed_results: false,
      onboarding_completed_at: "2026-07-01T00:00:00.000Z",
      onboarding_version: 1,
      location: "Olongapo",
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-01T00:00:00.000Z",
    },
    session: {
      access_token: "session-token-1",
      refresh_token: null,
      token_type: "bearer",
      expires_in: 28800,
      expires_at: 1783900800,
    },
    roles: [],
    primaryRole: "inspector" as const,
    isAdmin: false,
    isDeveloper: false,
    csrfToken: "csrf-token-1",
    authenticatedAt: "2026-07-07T00:00:00.000Z",
    offlineExpiresAt: "2026-07-08T00:00:00.000Z",
  };
}

function installDom(online = true): { container: HTMLDivElement; cleanup: () => void } {
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
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: fakeIndexedDb,
  });
  Object.defineProperty(dom.window.navigator, "onLine", {
    configurable: true,
    value: online,
  });

  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);

  return {
    container,
    cleanup: () => {
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
      Object.defineProperty(globalThis, "indexedDB", {
        configurable: true,
        value: originalIndexedDb,
      });
      dom.window.close();
    },
  };
}

async function flushEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function flushEffectsUntil(predicate: () => boolean, attempts = 5): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) {
      return;
    }

    await flushEffects();
  }
}

function AuthProbe({ onChange }: { onChange: (state: AuthProbeState) => void }) {
  const auth = useAuth();
  onChange(auth);
  return <div data-user-id={auth.user?.id ?? "anonymous"} />;
}

test("online inactivity lock signs out server-side and clears the stored session envelope", async () => {
  const { container, cleanup } = installDom(true);
  const root: Root = createRoot(container);
  const originalGetSession = (authClient as { getSession?: typeof authClient.signIn }).getSession;
  const originalSignOut = authClient.signOut.bind(authClient);
  let currentAuth: AuthProbeState | null = null;
  let signOutCalls = 0;
  let getSessionCalls = 0;

  try {
    await clearOfflineAuthEnvelope();
    (authClient as { getSession: () => Promise<ReturnType<typeof createBootstrapPayload>> }).getSession = async () => {
      getSessionCalls += 1;
      return createBootstrapPayload();
    };
    authClient.signOut = async () => {
      signOutCalls += 1;
    };

    await act(async () => {
      root.render(
        <AuthProvider>
          <AuthProbe onChange={(state) => { currentAuth = state; }} />
        </AuthProvider>,
      );
    });
    await flushEffectsUntil(() => currentAuth?.user?.id === "user-1");

    assert.ok(await loadOfflineAuthEnvelope());
    assert.equal(await refreshApiSessionForCsrf(), "csrf-token-1");
    assert.equal(getSessionCalls, 2);

    await act(async () => {
      await currentAuth?.lock();
    });

    assert.equal(signOutCalls, 1);
    assert.equal(currentAuth?.user, null);
    assert.equal(currentAuth?.authMode, "anonymous");
    assert.equal(await loadOfflineAuthEnvelope(), null);

    await act(async () => {
      root.unmount();
    });
    assert.equal(await refreshApiSessionForCsrf(), null);
  } finally {
    (authClient as { getSession?: typeof authClient.signIn }).getSession = originalGetSession;
    authClient.signOut = originalSignOut;
    await clearOfflineAuthEnvelope();
    clearApiCsrfToken();
    cleanup();
  }
});
