import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React from "react";
import { act } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { createRoot } from "react-dom/client";

import { AdminRoute, type AdminRouteProps } from "../../../src/app/router/guards/admin-route";

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

async function renderAdminRoute(props: AdminRouteProps) {
  const { container, cleanup } = installDom();
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminRoute {...props}>
          <div data-testid="admin">admin</div>
        </AdminRoute>
        <LocationProbe />
      </MemoryRouter>,
    );
  });

  return {
    container,
    cleanup: async () => {
      await act(async () => root.unmount());
      cleanup();
    },
  };
}

test("admin route redirects anonymous users to login", async () => {
  const view = await renderAdminRoute({ user: null, isAdmin: false, isLoading: false });

  try {
    assert.equal(view.container.querySelector('[data-testid="location"]')?.textContent, "/login");
  } finally {
    await view.cleanup();
  }
});

test("admin route permits administrators and redirects regular users to inspect", async () => {
  const adminView = await renderAdminRoute({ user: { id: "admin-1" }, isAdmin: true, isLoading: false });

  try {
    assert.equal(adminView.container.querySelector('[data-testid="admin"]')?.textContent, "admin");
  } finally {
    await adminView.cleanup();
  }

  const userView = await renderAdminRoute({ user: { id: "user-1" }, isAdmin: false, isLoading: false });

  try {
    assert.equal(userView.container.querySelector('[data-testid="location"]')?.textContent, "/inspect");
  } finally {
    await userView.cleanup();
  }
});
