import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useIsDesktop } from "../src/hooks/use-desktop";

type GlobalWithDom = typeof globalThis & {
  window: Window & typeof globalThis;
  document: Document;
  navigator: Navigator;
  HTMLElement: typeof HTMLElement;
};

type MediaQueryListener = () => void;

function installDom(innerWidth = 1440): { container: HTMLDivElement; cleanup: () => void } {
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
  const listeners = new Set<MediaQueryListener>();

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

  Object.defineProperty(dom.window, "innerWidth", {
    configurable: true,
    writable: true,
    value: innerWidth,
  });

  Object.defineProperty(dom.window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: innerWidth >= 1024,
      media: query,
      onchange: null,
      addEventListener: (_event: string, listener: MediaQueryListener) => {
        listeners.add(listener);
      },
      removeEventListener: (_event: string, listener: MediaQueryListener) => {
        listeners.delete(listener);
      },
      addListener: (listener: MediaQueryListener) => {
        listeners.add(listener);
      },
      removeListener: (listener: MediaQueryListener) => {
        listeners.delete(listener);
      },
      dispatchEvent: () => true,
    }),
  });

  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);

  return {
    container,
    cleanup: () => {
      listeners.clear();
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
    },
  };
}

function DesktopProbe({ onRender }: { onRender: (value: boolean | undefined) => void }) {
  onRender(useIsDesktop());
  return null;
}

test("useIsDesktop keeps the initial render unresolved until the media query effect runs", async () => {
  const { container, cleanup } = installDom(1440);
  const root: Root = createRoot(container);
  const renders: Array<boolean | undefined> = [];

  try {
    await act(async () => {
      root.render(<DesktopProbe onRender={(value) => renders.push(value)} />);
    });

    assert.deepEqual(renders, [undefined, true]);
  } finally {
    await act(async () => {
      root.unmount();
    });
    cleanup();
  }
});
