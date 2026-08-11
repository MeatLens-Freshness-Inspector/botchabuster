import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React from "react";
import { act } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { createRoot } from "react-dom/client";

import { ProtectedRoute, type ProtectedRouteProps } from "../../../src/app/router/guards/protected-route";

type GlobalWithDom = typeof globalThis & {
  window: Window & typeof globalThis;
  document: Document;
  navigator: Navigator;
};

function installDom(): { container: HTMLDivElement; cleanup: () => void } {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
  const globals = globalThis as GlobalWithDom;
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
  };

  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
  Object.defineProperty(globals, "window", { configurable: true, value: dom.window as unknown as Window & typeof globalThis });
  Object.defineProperty(globals, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globals, "navigator", { configurable: true, value: dom.window.navigator });

  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);

  return {
    container,
    cleanup: () => {
      Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: undefined });
      Object.defineProperty(globals, "window", { configurable: true, value: previous.window });
      Object.defineProperty(globals, "document", { configurable: true, value: previous.document });
      Object.defineProperty(globals, "navigator", { configurable: true, value: previous.navigator });
      dom.window.close();
    },
  };
}

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

function renderGuard(props: ProtectedRouteProps) {
  const { container, cleanup } = installDom();
  const root = createRoot(container);

  return {
    container,
    cleanup: async () => {
      await act(async () => root.unmount());
      cleanup();
    },
    render: async () => {
      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={["/inspect"]}>
            <ProtectedRoute {...props}>
              <div data-testid="protected">protected</div>
            </ProtectedRoute>
            <LocationProbe />
          </MemoryRouter>,
        );
      });
    },
  };
}

const readyState: Omit<ProtectedRouteProps, "children"> = {
  user: null,
  isAdmin: false,
  isLoading: false,
  profile: null,
  profileStatus: "ready",
  retryProfileLoad: async () => undefined,
  skippedForSession: false,
};

test("protected route redirects anonymous users to login", async () => {
  const view = renderGuard(readyState);

  try {
    await view.render();
    assert.equal(view.container.querySelector('[data-testid="location"]')?.textContent, "/login");
  } finally {
    await view.cleanup();
  }
});

test("protected route renders its children for a ready authenticated user", async () => {
  const view = renderGuard({
    ...readyState,
    user: { id: "user-1" },
    profile: { onboarding_completed_at: "2026-01-01T00:00:00.000Z" },
  });

  try {
    await view.render();
    assert.equal(view.container.querySelector('[data-testid="protected"]')?.textContent, "protected");
  } finally {
    await view.cleanup();
  }
});
