import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { indexedDB as fakeIndexedDb } from "fake-indexeddb";
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";
import { authClient } from "../src/integrations/api/AuthClient";
import { clearApiCsrfToken, getApiCsrfToken } from "../src/integrations/api/apiRequest";
import { createPasswordVerifier } from "../src/lib/offlineCredentials";
import {
  clearOfflineAuthEnvelope,
  loadOfflineAuthEnvelope,
  saveOfflineAuthEnvelope,
} from "../src/lib/offlineAuthEnvelope";

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
  return <div data-user-id={auth.user?.id ?? "anonymous"} data-loading={String(auth.isLoading)} />;
}

test("bootstraps online auth from /api/auth/session and writes the offline auth envelope", async () => {
  const { container, cleanup } = installDom(true);
  const root: Root = createRoot(container);
  const originalGetSession = (authClient as { getSession?: typeof authClient.signIn }).getSession;
  let currentAuth: AuthProbeState | null = null;

  try {
    await clearOfflineAuthEnvelope();
    (authClient as { getSession: () => Promise<ReturnType<typeof createBootstrapPayload>> }).getSession = async () =>
      createBootstrapPayload();

    await act(async () => {
      root.render(
        <AuthProvider>
          <AuthProbe onChange={(state) => { currentAuth = state; }} />
        </AuthProvider>,
      );
    });
    await flushEffectsUntil(() => currentAuth?.user?.id === "user-1");

    assert.equal(currentAuth?.user?.id, "user-1");
    assert.equal(currentAuth?.session?.access_token, "session-token-1");
    assert.equal(currentAuth?.profile?.id, "user-1");
    assert.equal(getApiCsrfToken(), "csrf-token-1");
    assert.match(window.sessionStorage.getItem("meatlens-auth-session") ?? "", /session-token-1/);
    const storedEnvelope = await loadOfflineAuthEnvelope();
    assert.equal(storedEnvelope?.authenticatedAt, "2026-07-07T00:00:00.000Z");
    assert.deepEqual(storedEnvelope?.roles, []);
    assert.equal(storedEnvelope?.primaryRole, "inspector");
    assert.equal(storedEnvelope?.isDeveloper, false);
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

test("bootstrapping online auth keeps the cached session token available for the /api/auth/session request", async () => {
  const { container, cleanup } = installDom(true);
  const root: Root = createRoot(container);
  const originalFetch = globalThis.fetch;
  let authorizationHeader: string | null = null;

  try {
    await clearOfflineAuthEnvelope();
    window.localStorage.setItem(
      "meatlens-auth-user",
      JSON.stringify({
        id: "user-1",
        email: "inspector@example.com",
      }),
    );
    window.sessionStorage.setItem(
      "meatlens-auth-session",
      JSON.stringify({
        access_token: "cached-session-token",
        refresh_token: null,
        token_type: "bearer",
        expires_in: 28800,
        expires_at: 1783900800,
      }),
    );

    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      authorizationHeader = headers.get("authorization");

      return new Response(JSON.stringify(createBootstrapPayload()), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }) as typeof globalThis.fetch;

    await act(async () => {
      root.render(
        <AuthProvider>
          <AuthProbe onChange={() => undefined} />
        </AuthProvider>,
      );
    });
    await flushEffects();

    assert.equal(authorizationHeader, "Bearer cached-session-token");
  } finally {
    globalThis.fetch = originalFetch;
    await act(async () => {
      root.unmount();
    });
    await clearOfflineAuthEnvelope();
    clearApiCsrfToken();
    cleanup();
  }
});

test("explicit sign-out clears the offline auth envelope immediately", async () => {
  const { container, cleanup } = installDom(true);
  const root: Root = createRoot(container);
  const originalGetSession = (authClient as { getSession?: typeof authClient.signIn }).getSession;
  const originalSignOut = authClient.signOut.bind(authClient);
  let currentAuth: AuthProbeState | null = null;

  try {
    await clearOfflineAuthEnvelope();
    (authClient as { getSession: () => Promise<ReturnType<typeof createBootstrapPayload>> }).getSession = async () =>
      createBootstrapPayload();
    authClient.signOut = async () => undefined;

    await act(async () => {
      root.render(
        <AuthProvider>
          <AuthProbe onChange={(state) => { currentAuth = state; }} />
        </AuthProvider>,
      );
    });
    await flushEffects();

    let storedEnvelope = await loadOfflineAuthEnvelope();
    for (let attempt = 0; attempt < 5 && !storedEnvelope; attempt += 1) {
      await flushEffects();
      storedEnvelope = await loadOfflineAuthEnvelope();
    }

    assert.ok(storedEnvelope);

    await act(async () => {
      await currentAuth?.signOut();
    });

    assert.equal(currentAuth?.user, null);
    assert.equal(await loadOfflineAuthEnvelope(), null);
  } finally {
    (authClient as { getSession?: typeof authClient.signIn }).getSession = originalGetSession;
    authClient.signOut = originalSignOut;
    await act(async () => {
      root.unmount();
    });
    await clearOfflineAuthEnvelope();
    clearApiCsrfToken();
    cleanup();
  }
});

test("bootstrap 401 without an offline envelope falls back to anonymous instead of expired", async () => {
  const { container, cleanup } = installDom(true);
  const root: Root = createRoot(container);
  const originalGetSession = (authClient as { getSession?: typeof authClient.signIn }).getSession;
  let currentAuth: AuthProbeState | null = null;

  try {
    await clearOfflineAuthEnvelope();
    (authClient as { getSession: () => Promise<never> }).getSession = async () => {
      const error = new Error("Authentication required") as Error & { status?: number };
      error.status = 401;
      throw error;
    };

    await act(async () => {
      root.render(
        <AuthProvider>
          <AuthProbe onChange={(state) => { currentAuth = state; }} />
        </AuthProvider>,
      );
    });
    await flushEffects();

    assert.equal(currentAuth?.user, null);
    assert.equal(currentAuth?.authMode, "anonymous");
    assert.equal(currentAuth?.isLoading, false);
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

test("offline password unlock works only while the stored 24-hour window is still valid", async () => {
  const { container, cleanup } = installDom(false);
  const root: Root = createRoot(container);
  const originalGetSession = (authClient as { getSession?: typeof authClient.signIn }).getSession;
  let currentAuth: AuthProbeState | null = null;

  try {
    await clearOfflineAuthEnvelope();
    (authClient as { getSession: () => Promise<never> }).getSession = async () => {
      throw new Error("offline");
    };

    const bootstrapPayload = createBootstrapPayload();
    await saveOfflineAuthEnvelope({
      user: bootstrapPayload.user,
      profile: bootstrapPayload.profile,
      roles: bootstrapPayload.roles,
      primaryRole: bootstrapPayload.primaryRole,
      isAdmin: bootstrapPayload.isAdmin,
      isDeveloper: bootstrapPayload.isDeveloper,
      authenticatedAt: bootstrapPayload.authenticatedAt,
      offlineExpiresAt: "2099-01-01T00:00:00.000Z",
      offlineUnlockRequired: true,
      passwordVerifier: await createPasswordVerifier("inspector@example.com", "secret-123"),
      localPasskey: null,
    });

    await act(async () => {
      root.render(
        <AuthProvider>
          <AuthProbe onChange={(state) => { currentAuth = state; }} />
        </AuthProvider>,
      );
    });
    await flushEffects();

    assert.equal(currentAuth?.user, null);
    assert.equal(currentAuth?.offlineUnlockRequired, true);

    await act(async () => {
      await currentAuth?.signIn("inspector@example.com", "secret-123");
    });

    assert.equal(currentAuth?.user?.id, "user-1");
    assert.equal(currentAuth?.offlineUnlockRequired, false);

    await saveOfflineAuthEnvelope({
      user: bootstrapPayload.user,
      profile: bootstrapPayload.profile,
      roles: bootstrapPayload.roles,
      primaryRole: bootstrapPayload.primaryRole,
      isAdmin: bootstrapPayload.isAdmin,
      isDeveloper: bootstrapPayload.isDeveloper,
      authenticatedAt: bootstrapPayload.authenticatedAt,
      offlineExpiresAt: "2000-01-01T00:00:00.000Z",
      offlineUnlockRequired: true,
      passwordVerifier: await createPasswordVerifier("inspector@example.com", "secret-123"),
      localPasskey: null,
    });

    await assert.rejects(
      async () => currentAuth?.signIn("inspector@example.com", "secret-123"),
      /internet|expired/i,
    );
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
