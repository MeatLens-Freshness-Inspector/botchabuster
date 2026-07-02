import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

import { Input } from "../src/components/ui/input";

type GlobalWithDom = typeof globalThis & {
  window: Window & typeof globalThis;
  document: Document;
  navigator: Navigator;
  HTMLElement: typeof HTMLElement;
  HTMLButtonElement: typeof HTMLButtonElement;
  HTMLInputElement: typeof HTMLInputElement;
  MouseEvent: typeof MouseEvent;
};

function installDom(): { container: HTMLDivElement; cleanup: () => void } {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });

  const previousGlobals = {
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
    HTMLElement: globalThis.HTMLElement,
    HTMLButtonElement: globalThis.HTMLButtonElement,
    HTMLInputElement: globalThis.HTMLInputElement,
    MouseEvent: globalThis.MouseEvent,
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
  Object.defineProperty(globals, "HTMLButtonElement", {
    configurable: true,
    value: dom.window.HTMLButtonElement,
  });
  Object.defineProperty(globals, "HTMLInputElement", {
    configurable: true,
    value: dom.window.HTMLInputElement,
  });
  Object.defineProperty(globals, "MouseEvent", {
    configurable: true,
    value: dom.window.MouseEvent,
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
      Object.defineProperty(globals, "HTMLButtonElement", {
        configurable: true,
        value: previousGlobals.HTMLButtonElement,
      });
      Object.defineProperty(globals, "HTMLInputElement", {
        configurable: true,
        value: previousGlobals.HTMLInputElement,
      });
      Object.defineProperty(globals, "MouseEvent", {
        configurable: true,
        value: previousGlobals.MouseEvent,
      });
      dom.window.close();
    },
  };
}

test("password inputs render one visibility toggle and switch text visibility", async () => {
  const { container, cleanup } = installDom();
  const root: Root = createRoot(container);

  try {
    await act(async () => {
      root.render(<Input id="password" type="password" defaultValue="secret-123" />);
    });

    const input = container.querySelector("input");
    assert.ok(input instanceof HTMLInputElement);
    assert.equal(input.type, "password");

    const toggleButtons = container.querySelectorAll("button");
    assert.equal(toggleButtons.length, 1);

    const toggleButton = toggleButtons[0];
    assert.equal(toggleButton.getAttribute("type"), "button");
    assert.match(toggleButton.getAttribute("aria-label") ?? "", /show password/i);

    await act(async () => {
      toggleButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    assert.equal(input.type, "text");
    assert.match(toggleButton.getAttribute("aria-label") ?? "", /hide password/i);
  } finally {
    await act(async () => {
      root.unmount();
    });
    cleanup();
  }
});
