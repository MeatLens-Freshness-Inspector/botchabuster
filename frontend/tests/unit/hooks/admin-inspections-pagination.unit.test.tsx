import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Inspection } from "../../../src/entities/inspection";
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

const mockInspections: Inspection[] = Array.from({ length: 15 }, (_, i) => ({
  id: `inspection-${i + 1}`,
  user_id: `user-${i + 1}`,
  meat_type: i % 2 === 0 ? "beef" : "pork",
  classification: "fresh",
  confidence_score: 90,
  flagged_deviations: [],
  explanation: null,
  image_url: null,
  location: "Market",
  created_at: "2026-08-01T10:00:00.000Z",
  updated_at: "2026-08-01T10:00:00.000Z",
}));

test("InspectionsTabContent paginates admin inspections to 10 items per page", async () => {
  const { container, cleanup } = installDom();
  const root: Root = createRoot(container);

  const mockDashboard = {
    inspections: mockInspections,
    filteredInspections: mockInspections,
    paginatedInspections: mockInspections.slice(0, 10),
    inspectionPage: 1,
    inspectionPageSize: 10,
    totalInspectionPages: 2,
    setInspectionPage: () => undefined,
    inspectorFilter: "",
    profileById: new Map(),
    setInspectorFilter: () => undefined,
    setPreviewImageUrl: () => undefined,
    handleDeleteInspection: () => undefined,
  } as unknown as AdminDashboardPageViewModel;

  try {
    const { InspectionsTab: InspectionsTabContent } = await import(
      "../../../src/widgets/admin-dashboard"
    );

    await act(async () => {
      root.render(<InspectionsTabContent dashboard={mockDashboard} />);
    });

    const text = document.body.textContent ?? "";
    assert.match(text, /All Inspections/);
    assert.match(text, /Showing 1-10 of 15/);
    assert.match(text, /inspection-10/);
    assert.match(text, /Future validation \/ research use/);
    assert.doesNotMatch(text, /inspection-11/);
  } finally {
    await act(async () => {
      root.unmount();
    });
    cleanup();
  }
});
