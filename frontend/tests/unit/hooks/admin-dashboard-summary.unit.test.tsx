import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ShieldCheck } from "lucide-react";
import type { AdminDashboardPageViewModel } from "../../../src/widgets/admin-dashboard";

type GlobalWithDom = typeof globalThis & {
  window: Window & typeof globalThis;
  document: Document;
  navigator: Navigator;
  HTMLElement: typeof HTMLElement;
  SVGElement: typeof SVGElement;
};

function installDom(): { container: HTMLDivElement; cleanup: () => void } {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
  const globals = globalThis as GlobalWithDom;
  const previousGlobals = {
    React: (globalThis as typeof globalThis & { React?: typeof React }).React,
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
    HTMLElement: globalThis.HTMLElement,
    SVGElement: globalThis.SVGElement,
    ResizeObserver: globalThis.ResizeObserver,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
  };

  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(globalThis, "React", {
    configurable: true,
    value: React,
  });
  Object.defineProperty(globals, "window", {
    configurable: true,
    value: dom.window as unknown as Window & typeof globalThis,
  });
  Object.defineProperty(globals, "document", {
    configurable: true,
    value: dom.window.document,
  });
  Object.defineProperty(globals, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });
  Object.defineProperty(globals, "HTMLElement", {
    configurable: true,
    value: dom.window.HTMLElement,
  });
  Object.defineProperty(globals, "SVGElement", {
    configurable: true,
    value: dom.window.SVGElement,
  });
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
  Object.defineProperty(globalThis, "requestAnimationFrame", {
    configurable: true,
    value: (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0),
  });
  Object.defineProperty(globalThis, "cancelAnimationFrame", {
    configurable: true,
    value: (id: number) => clearTimeout(id),
  });

  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);

  return {
    container,
    cleanup: () => {
      Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(globalThis, "React", {
        configurable: true,
        value: previousGlobals.React,
      });
      Object.defineProperty(globals, "window", {
        configurable: true,
        value: previousGlobals.window,
      });
      Object.defineProperty(globals, "document", {
        configurable: true,
        value: previousGlobals.document,
      });
      Object.defineProperty(globals, "navigator", {
        configurable: true,
        value: previousGlobals.navigator,
      });
      Object.defineProperty(globals, "HTMLElement", {
        configurable: true,
        value: previousGlobals.HTMLElement,
      });
      Object.defineProperty(globals, "SVGElement", {
        configurable: true,
        value: previousGlobals.SVGElement,
      });
      Object.defineProperty(globalThis, "ResizeObserver", {
        configurable: true,
        value: previousGlobals.ResizeObserver,
      });
      Object.defineProperty(globalThis, "requestAnimationFrame", {
        configurable: true,
        value: previousGlobals.requestAnimationFrame,
      });
      Object.defineProperty(globalThis, "cancelAnimationFrame", {
        configurable: true,
        value: previousGlobals.cancelAnimationFrame,
      });
      dom.window.close();
    },
  };
}

const dashboard = {
  activeTabConfig: {
    label: "Overview",
    icon: ShieldCheck,
  },
  stats: {
    total_users: 9,
    total_inspections: 103,
  },
  avgConfidence: 89,
  spoiledRate: 18,
  recentTrend: -100,
  dailyInspections: [
    { date: "Jul 26", count: 4 },
  ],
  chartConfig: {},
  handleRefresh: () => undefined,
} as unknown as AdminDashboardPageViewModel;

test("summary shows the existing KPIs without the removed inspection-volume chart", async () => {
  const { container, cleanup } = installDom();
  const root: Root = createRoot(container);

  try {
    const { default: AdminDashboardSummary } = await import(
      "../../../src/pages/admin-dashboard/components/AdminDashboardSummary"
    );

    await act(async () => {
      root.render(<AdminDashboardSummary dashboard={dashboard} />);
    });

    const text = document.body.textContent ?? "";
    assert.match(text, /Total Users/);
    assert.match(text, /Total Inspections/);
    assert.match(text, /Avg Confidence/);
    assert.match(text, /Spoiled Rate/);
    assert.doesNotMatch(text, /Inspection volume/);
    assert.doesNotMatch(text, /Last 14 days/);
  } finally {
    await act(async () => {
      root.unmount();
    });
    cleanup();
  }
});
