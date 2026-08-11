import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";

import { NotificationProvider } from "../../../src/app/providers/notification-provider";

type GlobalWithDom = typeof globalThis & {
  window: Window & typeof globalThis;
  document: Document;
  navigator: Navigator;
  MutationObserver: typeof MutationObserver;
};

function installDom(): { container: HTMLDivElement; cleanup: () => void } {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
  const globals = globalThis as GlobalWithDom;
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
    MutationObserver: globalThis.MutationObserver,
  };

  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
  Object.defineProperty(globals, "window", { configurable: true, value: dom.window as unknown as Window & typeof globalThis });
  Object.defineProperty(globals, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globals, "navigator", { configurable: true, value: dom.window.navigator });
  Object.defineProperty(globals, "MutationObserver", { configurable: true, value: dom.window.MutationObserver });

  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);

  return {
    container,
    cleanup: () => {
      Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: undefined });
      Object.defineProperty(globals, "window", { configurable: true, value: previous.window });
      Object.defineProperty(globals, "document", { configurable: true, value: previous.document });
      Object.defineProperty(globals, "navigator", { configurable: true, value: previous.navigator });
      Object.defineProperty(globals, "MutationObserver", { configurable: true, value: previous.MutationObserver });
      dom.window.close();
    },
  };
}

test("notification provider keeps notification infrastructure around its children", async () => {
  const { container, cleanup } = installDom();
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        <NotificationProvider>
          <div data-testid="content">content</div>
        </NotificationProvider>,
      );
    });

    assert.equal(container.querySelector('[data-testid="content"]')?.textContent, "content");
  } finally {
    await act(async () => root.unmount());
    cleanup();
  }
});
