import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { DisputeCharts } from "../../../../src/widgets/admin-dashboard/ui/dispute-charts";

type GlobalWithDom = typeof globalThis & { window: Window & typeof globalThis; document: Document };

function installDom(): { container: HTMLDivElement; cleanup: () => void } {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const globals = globalThis as GlobalWithDom;
  const previous = { window: globalThis.window, document: globalThis.document };
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
  Object.defineProperty(globals, "window", { configurable: true, value: dom.window as unknown as Window & typeof globalThis });
  Object.defineProperty(globals, "document", { configurable: true, value: dom.window.document });
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  return {
    container,
    cleanup: () => {
      Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: undefined });
      Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, value: undefined });
      Object.defineProperty(globals, "window", { configurable: true, value: previous.window });
      Object.defineProperty(globals, "document", { configurable: true, value: previous.document });
      dom.window.close();
    },
  };
}

test("renders status and daily dispute charts", async () => {
  const { container, cleanup } = installDom();
  const root: Root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        <DisputeCharts
          statusDistribution={[
            { status: "pending", count: 1 },
            { status: "approved", count: 2 },
            { status: "rejected", count: 1 },
          ]}
          dailyTrend={[{ date: "2026-09-01", count: 2 }, { date: "2026-09-02", count: 2 }]}
        />,
      );
    });

    assert.match(container.textContent ?? "", /Disputes by status/);
    assert.match(container.textContent ?? "", /Disputes over time/);
  } finally {
    await act(async () => root.unmount());
    cleanup();
  }
});
