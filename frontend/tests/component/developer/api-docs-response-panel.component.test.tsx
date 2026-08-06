import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { ApiDocsResponsePanel } from "../../../src/pages/admin-dashboard/components/developer/api-docs/ApiDocsResponsePanel";
import type { ApiDocsResponse } from "../../../src/pages/admin-dashboard/components/developer/api-docs/response";

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

const response: ApiDocsResponse = {
  ok: true,
  status: 200,
  statusText: "OK",
  elapsedMs: 14,
  sizeBytes: 17,
  headers: { "content-type": "application/json", "x-trace": "trace-1" },
  bodyKind: "json",
  displayBody: '{\n  "ok": true\n}',
  errorMessage: null,
};

test("renders response metrics, body, headers, and copy actions", async () => {
  const { container, cleanup } = installDom();
  const root: Root = createRoot(container);

  try {
    await act(async () => {
      root.render(<ApiDocsResponsePanel response={response} isSending={false} executionError={null} curlCommand="curl example" />);
    });

    assert.match(container.textContent ?? "", /200/);
    assert.match(container.textContent ?? "", /14 ms/);
    assert.match(container.textContent ?? "", /\"ok\": true/);
    assert.ok(container.querySelector('button[aria-label="Copy response body"]'));
    assert.ok(container.querySelector('button[aria-label="Copy cURL"]'));

    const headersButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Headers");
    assert.ok(headersButton);
    await act(async () => (headersButton as HTMLButtonElement).click());
    assert.match(container.textContent ?? "", /x-trace/);
  } finally {
    await act(async () => root.unmount());
    cleanup();
  }
});

test("renders loading and execution error states", async () => {
  const { container, cleanup } = installDom();
  const root: Root = createRoot(container);

  try {
    await act(async () => {
      root.render(<ApiDocsResponsePanel response={null} isSending={true} executionError="Network failed" curlCommand="" />);
    });
    assert.match(container.textContent ?? "", /Sending request/);
    assert.match(container.textContent ?? "", /Network failed/);
  } finally {
    await act(async () => root.unmount());
    cleanup();
  }
});
