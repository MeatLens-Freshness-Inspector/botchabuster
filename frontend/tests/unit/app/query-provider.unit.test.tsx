import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React from "react";
import { act } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";

import { QueryProvider } from "../../../src/app/providers/query-provider";
import { queryClient } from "../../../src/app/config/query-client";

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

function QueryClientProbe({ onClient }: { onClient: (client: QueryClient) => void }) {
  onClient(useQueryClient());
  return null;
}

test("query provider supplies the configured app query client", async () => {
  const { container, cleanup } = installDom();
  const root = createRoot(container);
  let receivedClient: QueryClient | undefined;

  try {
    await act(async () => {
      root.render(
        <QueryProvider>
          <QueryClientProbe onClient={(client) => { receivedClient = client; }} />
        </QueryProvider>,
      );
    });

    assert.equal(receivedClient, queryClient);
  } finally {
    await act(async () => root.unmount());
    cleanup();
  }
});
