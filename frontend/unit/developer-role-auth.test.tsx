import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { indexedDB as fakeIndexedDb } from "fake-indexeddb";
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";
import { authClient } from "../src/integrations/api/AuthClient";
import { clearApiCsrfToken } from "../src/integrations/api/apiRequest";
import {
  clearOfflineAuthEnvelope,
  loadOfflineAuthEnvelope,
  saveOfflineAuthEnvelope,
} from "../src/lib/offlineAuthEnvelope";
import { createPasswordVerifier } from "../src/lib/offlineCredentials";

type GlobalWithDom = typeof globalThis & {
  window: Window & typeof globalThis;
  document: Document;
  navigator: Navigator;
  HTMLElement: typeof HTMLElement;
};

type AuthProbeState = ReturnType<typeof useAuth>;

const originalIndexedDb = globalThis.indexedDB;

function createDeveloperBootstrapPayload() {
  return {
    user: {
      id: "developer-1",
      email: "developer@example.com",
    },
    profile: {
      id: "developer-1",
      full_name: "Developer Example",
      avatar_url: null,
      inspector_code: "DEV-001",
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
      access_token: "developer-session-token",
      refresh_token: null,
      token_type: "bearer",
      expires_in: 28800,
      expires_at: 1783900800,
    },
    roles: ["developer"],
    primaryRole: "developer" as const,
    isAdmin: true,
    isDeveloper: true,
    csrfToken: "csrf-developer",
    authenticatedAt: "2026-07-13T00:00:00.000Z",
    offlineExpiresAt: "2099-01-01T00:00:00.000Z",
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

test("AuthProvider stores developer role state in the offline envelope", async () => {
  const { container, cleanup } = installDom(true);
  const root: Root = createRoot(container);
  const originalGetSession = (authClient as { getSession?: typeof authClient.signIn }).getSession;
  let currentAuth: AuthProbeState | null = null;

  try {
    await clearOfflineAuthEnvelope();
    (authClient as { getSession: () => Promise<ReturnType<typeof createDeveloperBootstrapPayload>> }).getSession =
      async () => createDeveloperBootstrapPayload();

    await act(async () => {
      root.render(
        <AuthProvider>
          <AuthProbe onChange={(state) => { currentAuth = state; }} />
        </AuthProvider>,
      );
    });
    await flushEffectsUntil(() => currentAuth?.user?.id === "developer-1");

    assert.equal(currentAuth?.isAdmin, true);
    assert.equal(currentAuth?.isDeveloper, true);

    const storedEnvelope = await loadOfflineAuthEnvelope();
    assert.deepEqual(storedEnvelope?.roles, ["developer"]);
    assert.equal(storedEnvelope?.primaryRole, "developer");
    assert.equal(storedEnvelope?.isAdmin, true);
    assert.equal(storedEnvelope?.isDeveloper, true);
  } finally {
    (authClient as { getSession?: typeof authClient.signIn }).getSession = originalGetSession;
    await act(async () => {
      root.unmount();
    });
    await clearOfflineAuthEnvelope();
    clearApiCsrfToken();
    cleanup();
  }
});

test("offline developer restore exposes isDeveloper from the cached envelope", async () => {
  const { container, cleanup } = installDom(false);
  const root: Root = createRoot(container);
  const originalGetSession = (authClient as { getSession?: typeof authClient.signIn }).getSession;
  let currentAuth: AuthProbeState | null = null;
  const bootstrapPayload = createDeveloperBootstrapPayload();

  try {
    await clearOfflineAuthEnvelope();
    (authClient as { getSession: () => Promise<never> }).getSession = async () => {
      throw new Error("offline");
    };

    await saveOfflineAuthEnvelope({
      user: bootstrapPayload.user,
      profile: bootstrapPayload.profile,
      roles: bootstrapPayload.roles,
      primaryRole: bootstrapPayload.primaryRole,
      isAdmin: bootstrapPayload.isAdmin,
      isDeveloper: bootstrapPayload.isDeveloper,
      authenticatedAt: bootstrapPayload.authenticatedAt,
      offlineExpiresAt: bootstrapPayload.offlineExpiresAt,
      offlineUnlockRequired: false,
      passwordVerifier: await createPasswordVerifier("developer@example.com", "secret-123"),
      localPasskey: null,
    });

    await act(async () => {
      root.render(
        <AuthProvider>
          <AuthProbe onChange={(state) => { currentAuth = state; }} />
        </AuthProvider>,
      );
    });
    await flushEffectsUntil(() => currentAuth?.offlineUnlockRequired === true);

    await act(async () => {
      await currentAuth?.signIn("developer@example.com", "secret-123");
    });

    assert.equal(currentAuth?.user?.id, "developer-1");
    assert.equal(currentAuth?.isAdmin, true);
    assert.equal(currentAuth?.isDeveloper, true);
    assert.equal(currentAuth?.offlineUnlockRequired, false);
  } finally {
    (authClient as { getSession?: typeof authClient.signIn }).getSession = originalGetSession;
    await act(async () => {
      root.unmount();
    });
    await clearOfflineAuthEnvelope();
    clearApiCsrfToken();
    cleanup();
  }
});
