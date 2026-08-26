import assert from "node:assert/strict";
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { test } from "node:test";
import { useExportTask } from "../../../src/shared/lib/use-export-task";

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

test("export task prevents duplicate work and clears its active state", async () => {
  const { container, cleanup } = installDom();
  const root: Root = createRoot(container);
  const work = deferred<void>();
  let calls = 0;

  function Harness() {
    const task = useExportTask<"csv">();
    return (
      <div>
        <span data-testid="active">{task.activeTask ?? "idle"}</span>
        <button
          type="button"
          onClick={() => void task.run("csv", async () => {
            calls += 1;
            await work.promise;
          })}
        >
          export
        </button>
      </div>
    );
  }

  try {
    await act(async () => root.render(<Harness />));
    const button = document.querySelector("button") as HTMLButtonElement;
    await act(async () => {
      button.click();
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    assert.equal(calls, 1);
    assert.equal(document.querySelector('[data-testid="active"]')?.textContent, "csv");

    await act(async () => {
      work.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    assert.equal(document.querySelector('[data-testid="active"]')?.textContent, "idle");
  } finally {
    await act(async () => root.unmount());
    cleanup();
  }
});
