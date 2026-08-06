import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { API_DOCS_CATEGORIES, API_DOCS_OPERATIONS } from "../../../src/pages/admin-dashboard/components/developer/api-docs/catalog";
import { ApiDocsCategoryNav } from "../../../src/pages/admin-dashboard/components/developer/api-docs/ApiDocsCategoryNav";

type GlobalWithDom = typeof globalThis & { window: Window & typeof globalThis; document: Document };

function installDom(): { container: HTMLDivElement; cleanup: () => void } {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const globals = globalThis as GlobalWithDom;
  const previous = { window: globalThis.window, document: globalThis.document };
  Object.defineProperty(globals, "window", { configurable: true, value: dom.window as unknown as Window & typeof globalThis });
  Object.defineProperty(globals, "document", { configurable: true, value: dom.window.document });
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  return {
    container,
    cleanup: () => {
      Object.defineProperty(globals, "window", { configurable: true, value: previous.window });
      Object.defineProperty(globals, "document", { configurable: true, value: previous.document });
      dom.window.close();
    },
  };
}

test("renders every API category and selects an operation", async () => {
  const { container, cleanup } = installDom();
  const root: Root = createRoot(container);
  let selectedOperationId = "";

  try {
    await act(async () => {
      root.render(
        <ApiDocsCategoryNav
          categories={API_DOCS_CATEGORIES}
          operations={API_DOCS_OPERATIONS}
          selectedOperationId="auth-sign-in"
          onSelectOperation={(operationId) => { selectedOperationId = operationId; }}
        />,
      );
    });

    const text = container.textContent ?? "";
    for (const category of API_DOCS_CATEGORIES) assert.match(text, new RegExp(category.label));
    assert.equal(container.querySelectorAll("[data-operation-id]").length, 53);

    await act(async () => {
      (container.querySelector('[data-operation-id="developer-dashboard-training-import"]') as HTMLButtonElement).click();
    });
    assert.equal(selectedOperationId, "developer-dashboard-training-import");
  } finally {
    await act(async () => root.unmount());
    cleanup();
  }
});
