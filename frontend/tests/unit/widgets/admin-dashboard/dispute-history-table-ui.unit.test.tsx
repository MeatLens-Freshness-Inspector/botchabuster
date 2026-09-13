import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { DisputeHistoryTable } from "../../../../src/widgets/admin-dashboard/ui/dispute-history-table";

type GlobalWithDom = typeof globalThis & { window: Window & typeof globalThis; document: Document };

function installDom(): { container: HTMLDivElement; cleanup: () => void } {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const globals = globalThis as GlobalWithDom;
  const previous = { window: globalThis.window, document: globalThis.document };
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
  Object.defineProperty(globals, "window", { configurable: true, value: dom.window as unknown as Window & typeof globalThis });
  Object.defineProperty(globals, "document", { configurable: true, value: dom.window.document });
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  return {
    container,
    cleanup: () => {
      Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: undefined });
      Object.defineProperty(globals, "window", { configurable: true, value: previous.window });
      Object.defineProperty(globals, "document", { configurable: true, value: previous.document });
      dom.window.close();
    },
  };
}

const baseDispute = {
  inspection_id: "inspection-1",
  submitted_by: "inspector-1",
  expected_classification: "spoiled",
  reason: "The result needs a second review.",
  status: "approved",
  developer_label_applied_at: null,
  developer_label_applied_by: null,
  reviewed_at: "2026-09-03T12:00:00.000Z",
  reviewed_by: "admin-1",
  reviewer_note: "Confirmed by review.",
  created_at: "2026-09-01T12:00:00.000Z",
  updated_at: "2026-09-03T12:00:00.000Z",
} as const;

test("renders every dispute record and neutral optional values", async () => {
  const { container, cleanup } = installDom();
  const root: Root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        <DisputeHistoryTable
          disputes={[
            {
              ...baseDispute,
              id: "dispute-1",
              inspection: { id: "inspection-1", meat_type: "pork", classification: "fresh" },
            } as any,
            { ...baseDispute, id: "dispute-2", inspection: null, reviewed_at: null, reviewed_by: null, reviewer_note: null } as any,
          ]}
        />,
      );
    });

    assert.equal(container.querySelectorAll("tbody tr").length, 2);
    assert.match(container.textContent ?? "", /Dispute ID/);
    assert.match(container.textContent ?? "", /Expected classification/);
    assert.match(container.textContent ?? "", /Reviewer note/);
    assert.match(container.textContent ?? "", /dispute-1/);
    assert.match(container.textContent ?? "", /dispute-2/);
    assert.match(container.textContent ?? "", /-/);
  } finally {
    await act(async () => root.unmount());
    cleanup();
  }
});

test("renders an explicit empty history state", async () => {
  const { container, cleanup } = installDom();
  const root: Root = createRoot(container);

  try {
    await act(async () => root.render(<DisputeHistoryTable disputes={[]} />));
    assert.match(container.textContent ?? "", /No disputes found in this date range\./);
  } finally {
    await act(async () => root.unmount());
    cleanup();
  }
});
