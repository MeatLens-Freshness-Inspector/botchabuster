import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { API_DOCS_OPERATIONS, createDefaultApiDocsEditorValues } from "../../../src/features/developer-tools";
import { ApiDocsRequestPanel } from "../../../src/features/developer-tools";
import type { ApiDocsEditorValues } from "../../../src/features/developer-tools";

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

function propsFor(operationId: string, overrides: Partial<React.ComponentProps<typeof ApiDocsRequestPanel>> = {}) {
  const operation = API_DOCS_OPERATIONS.find((entry) => entry.id === operationId) ?? API_DOCS_OPERATIONS[0];
  const editorValues: ApiDocsEditorValues = createDefaultApiDocsEditorValues(operation);
  return {
    operation,
    editorValues,
    isSending: false,
    executionError: null,
    pendingDeleteConfirmation: false,
    onParameterChange: () => undefined,
    onHeaderChange: () => undefined,
    onRemoveHeader: () => undefined,
    onBodyChange: () => undefined,
    onFileChange: () => undefined,
    onReset: () => undefined,
    onSend: () => undefined,
    onConfirmDelete: () => undefined,
    onCancelDelete: () => undefined,
    ...overrides,
  };
}

test("renders operation metadata and editable request controls", async () => {
  const { container, cleanup } = installDom();
  const root: Root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        <ApiDocsRequestPanel
          {...propsFor("inspections-get", {
            onBodyChange: () => undefined,
          })}
        />,
      );
    });

    assert.match(container.textContent ?? "", /Read one inspection/);
    assert.match(container.textContent ?? "", /Authenticated/);
    assert.ok(container.querySelector('input[aria-label="Path parameter id"]'));
    assert.ok(container.querySelector('input[aria-label="Query parameter scope"]'));

    await act(async () => {
      root.render(<ApiDocsRequestPanel {...propsFor("inspections-create", {
        onBodyChange: () => undefined,
      })} />);
    });
    assert.ok(container.querySelector('textarea[aria-label="JSON request body"]'));
  } finally {
    await act(async () => root.unmount());
    cleanup();
  }
});

test("shows a confirmation action before a DELETE request is sent", async () => {
  const { container, cleanup } = installDom();
  const root: Root = createRoot(container);
  let confirmed = false;

  try {
    await act(async () => {
      root.render(<ApiDocsRequestPanel {...propsFor("inspections-delete", {
        pendingDeleteConfirmation: true,
        onConfirmDelete: () => { confirmed = true; },
      })} />);
    });

    assert.match(container.textContent ?? "", /This DELETE request changes server data/);
    const confirm = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Confirm DELETE"));
    assert.ok(confirm);
    await act(async () => (confirm as HTMLButtonElement).click());
    assert.equal(confirmed, true);
  } finally {
    await act(async () => root.unmount());
    cleanup();
  }
});
