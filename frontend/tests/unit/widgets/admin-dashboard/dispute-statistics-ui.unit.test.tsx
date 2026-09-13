import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { DisputeStatistics } from "../../../../src/widgets/admin-dashboard/ui/dispute-statistics";
import DisputesTab from "../../../../src/widgets/admin-dashboard/ui/disputes-tab";

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

test("renders all dispute KPIs without review controls", async () => {
  const { container, cleanup } = installDom();
  const root: Root = createRoot(container);

  try {
    await act(async () => {
      root.render(<DisputeStatistics summary={{ total: 8, pending: 2, approved: 4, rejected: 2, disputeRate: 40 }} />);
    });

    assert.match(container.textContent ?? "", /Total disputes/);
    assert.match(container.textContent ?? "", /Pending/);
    assert.match(container.textContent ?? "", /Approved/);
    assert.match(container.textContent ?? "", /Rejected/);
    assert.match(container.textContent ?? "", /Dispute rate/);
    assert.match(container.textContent ?? "", /40%/);
    assert.doesNotMatch(container.textContent ?? "", /Review note|Apply developer label|Reason/);
  } finally {
    await act(async () => root.unmount());
    cleanup();
  }
});

test("renders the disputes tab as numbers only", async () => {
  const { container, cleanup } = installDom();
  const root: Root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        <DisputesTab
          dashboard={{
            disputeAnalytics: {
              summary: { total: 8, pending: 2, approved: 4, rejected: 2, disputeRate: 40 },
            },
          } as never}
        />,
      );
    });

    assert.match(container.textContent ?? "", /Total disputes/);
    assert.doesNotMatch(container.textContent ?? "", /Review note|Apply developer label|Reason/);
  } finally {
    await act(async () => root.unmount());
    cleanup();
  }
});
