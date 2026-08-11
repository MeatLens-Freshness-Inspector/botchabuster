import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { useApiDocs } from "../../../src/features/developer-tools";

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

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function Harness() {
  const apiDocs = useApiDocs();
  return (
    <div>
      <span data-testid="operation">{apiDocs.selectedOperation.id}</span>
      <span data-testid="status">{apiDocs.response?.status ?? "idle"}</span>
      <span data-testid="history">{apiDocs.history.length}</span>
      <button type="button" onClick={() => apiDocs.selectOperation("analysis-health")}>select</button>
      <button type="button" onClick={() => void apiDocs.send()}>send</button>
      <button type="button" onClick={() => apiDocs.replay(apiDocs.history[0])}>replay</button>
    </div>
  );
}

test("useApiDocs executes a selected request and records the response", async () => {
  const { container, cleanup } = installDom();
  const originalFetch = globalThis.fetch;
  const root: Root = createRoot(container);

  try {
    let capturedUrl = "";
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      capturedUrl = String(input);
      return new Response(JSON.stringify({ healthy: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;

    await act(async () => {
      root.render(<Harness />);
    });
    await act(async () => {
      (document.querySelector("button") as HTMLButtonElement).click();
    });
    await act(async () => {
      (Array.from(document.querySelectorAll("button"))[1] as HTMLButtonElement).click();
    });
    await flush();

    assert.equal(document.querySelector('[data-testid="operation"]')?.textContent, "analysis-health");
    assert.equal(document.querySelector('[data-testid="status"]')?.textContent, "200");
    assert.equal(document.querySelector('[data-testid="history"]')?.textContent, "1");
    assert.equal(capturedUrl, "http://localhost:3001/api/analysis/health");
  } finally {
    globalThis.fetch = originalFetch;
    await act(async () => root.unmount());
    cleanup();
  }
});

test("replay restores a history entry without sending it", async () => {
  const { container, cleanup } = installDom();
  const root: Root = createRoot(container);

  try {
    await act(async () => root.render(<Harness />));
    await act(async () => {
      (document.querySelector("button") as HTMLButtonElement).click();
    });
    await flush();
    assert.equal(document.querySelector('[data-testid="operation"]')?.textContent, "analysis-health");
  } finally {
    await act(async () => root.unmount());
    cleanup();
  }
});
