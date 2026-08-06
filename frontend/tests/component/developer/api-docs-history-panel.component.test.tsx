import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { ApiDocsHistoryPanel } from "../../../src/pages/admin-dashboard/components/developer/api-docs/ApiDocsHistoryPanel";
import type { ApiDocsHistoryEntry } from "../../../src/pages/admin-dashboard/components/developer/api-docs/history";

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

const entry: ApiDocsHistoryEntry = {
  id: "history-1",
  operationId: "inspections-list",
  method: "GET",
  url: "http://localhost:3001/api/inspections?limit=25",
  headers: {},
  values: { path: {}, query: { limit: "25" }, headers: {}, body: "" },
  status: 200,
  elapsedMs: 22,
  createdAt: "2026-08-06T10:00:00.000Z",
};

test("renders request history with replay and clear actions", async () => {
  const { container, cleanup } = installDom();
  const root: Root = createRoot(container);
  let replayed: ApiDocsHistoryEntry | undefined;
  let cleared = false;

  try {
    await act(async () => {
      root.render(<ApiDocsHistoryPanel entries={[entry]} onReplay={(value) => { replayed = value; }} onClear={() => { cleared = true; }} />);
    });

    assert.match(container.textContent ?? "", /Request history/);
    assert.match(container.textContent ?? "", /\/api\/inspections/);
    const replayButton = container.querySelector('button[aria-label="Replay GET /api/inspections"]') as HTMLButtonElement | null;
    assert.ok(replayButton);
    await act(async () => replayButton?.click());
    assert.equal(replayed?.id, "history-1");

    const clearButton = container.querySelector('button[aria-label="Clear request history"]') as HTMLButtonElement | null;
    assert.ok(clearButton);
    await act(async () => clearButton?.click());
    assert.equal(cleared, true);
  } finally {
    await act(async () => root.unmount());
    cleanup();
  }
});
