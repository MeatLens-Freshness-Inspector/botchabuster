import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { developerDashboardClient, DEFAULT_DEVELOPER_DATASET_FILTERS, type DeveloperDatasetListResponse } from "../src/integrations/api/DeveloperDashboardClient";
import { DeveloperDatasetsSection } from "../src/pages/admin-dashboard/components/developer/DeveloperDatasetsSection";

type GlobalWithDom = typeof globalThis & {
  window: Window & typeof globalThis;
  document: Document;
  navigator: Navigator;
  HTMLElement: typeof HTMLElement;
  HTMLButtonElement: typeof HTMLButtonElement;
  HTMLSelectElement: typeof HTMLSelectElement;
  MouseEvent: typeof MouseEvent;
  Event: typeof Event;
};

function installDom(): { container: HTMLDivElement; cleanup: () => void } {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
  const previousGlobals = {
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
    HTMLElement: globalThis.HTMLElement,
    HTMLButtonElement: globalThis.HTMLButtonElement,
    HTMLSelectElement: globalThis.HTMLSelectElement,
    MouseEvent: globalThis.MouseEvent,
    Event: globalThis.Event,
    getComputedStyle: globalThis.getComputedStyle,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
  };
  const previousCreateObjectUrl = URL.createObjectURL;
  const previousRevokeObjectUrl = URL.revokeObjectURL;
  const previousAnchorClick = dom.window.HTMLAnchorElement.prototype.click;
  const globals = globalThis as GlobalWithDom;

  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    value: true,
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
  Object.defineProperty(globals, "HTMLButtonElement", {
    configurable: true,
    value: dom.window.HTMLButtonElement,
  });
  Object.defineProperty(globals, "HTMLSelectElement", {
    configurable: true,
    value: dom.window.HTMLSelectElement,
  });
  Object.defineProperty(globals, "MouseEvent", {
    configurable: true,
    value: dom.window.MouseEvent,
  });
  Object.defineProperty(globals, "Event", {
    configurable: true,
    value: dom.window.Event,
  });
  Object.defineProperty(globalThis, "getComputedStyle", {
    configurable: true,
    value: dom.window.getComputedStyle.bind(dom.window),
  });
  Object.defineProperty(globalThis, "requestAnimationFrame", {
    configurable: true,
    value: (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0),
  });
  Object.defineProperty(globalThis, "cancelAnimationFrame", {
    configurable: true,
    value: (id: number) => clearTimeout(id),
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: () => "blob:developer-dashboard-test",
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: () => undefined,
  });
  Object.defineProperty(dom.window.HTMLAnchorElement.prototype, "click", {
    configurable: true,
    value: () => undefined,
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
      Object.defineProperty(globals, "HTMLButtonElement", {
        configurable: true,
        value: previousGlobals.HTMLButtonElement,
      });
      Object.defineProperty(globals, "HTMLSelectElement", {
        configurable: true,
        value: previousGlobals.HTMLSelectElement,
      });
      Object.defineProperty(globals, "MouseEvent", {
        configurable: true,
        value: previousGlobals.MouseEvent,
      });
      Object.defineProperty(globals, "Event", {
        configurable: true,
        value: previousGlobals.Event,
      });
      Object.defineProperty(globalThis, "getComputedStyle", {
        configurable: true,
        value: previousGlobals.getComputedStyle,
      });
      Object.defineProperty(globalThis, "requestAnimationFrame", {
        configurable: true,
        value: previousGlobals.requestAnimationFrame,
      });
      Object.defineProperty(globalThis, "cancelAnimationFrame", {
        configurable: true,
        value: previousGlobals.cancelAnimationFrame,
      });
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: previousCreateObjectUrl,
      });
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: previousRevokeObjectUrl,
      });
      Object.defineProperty(dom.window.HTMLAnchorElement.prototype, "click", {
        configurable: true,
        value: previousAnchorClick,
      });
      dom.window.close();
    },
  };
}

async function flushEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function getButtonByName(name: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll("button"))
    .find((candidate) => candidate.textContent?.trim() === name);
  assert.ok(button instanceof HTMLButtonElement, `Expected button named ${name}`);
  return button;
}

function activateRadixTab(name: string): void {
  getButtonByName(name).dispatchEvent(new MouseEvent("mousedown", {
    bubbles: true,
    button: 0,
    cancelable: true,
    ctrlKey: false,
  }));
}

const developerDatasetRows = [
  {
    id: "dataset-1",
    user_id: "inspector-1",
    meat_type: "beef",
    classification: "fresh",
    manual_classification: "fresh",
    confidence_score: 100,
    flagged_deviations: [],
    explanation: null,
    image_url: null,
    location: "North Market",
    inspector_notes: null,
    created_at: "2026-07-13T00:00:00.000Z",
    updated_at: "2026-07-13T00:00:00.000Z",
  },
  {
    id: "dataset-2",
    user_id: "inspector-2",
    meat_type: "fish",
    classification: "warning",
    manual_classification: "warning",
    confidence_score: 88,
    flagged_deviations: [],
    explanation: null,
    image_url: null,
    location: "South Market",
    inspector_notes: null,
    created_at: "2026-07-12T00:00:00.000Z",
    updated_at: "2026-07-12T00:00:00.000Z",
  },
];

const singleDeveloperDatasetPage: DeveloperDatasetListResponse = {
  items: [developerDatasetRows[0]],
  total: 1,
  limit: 25,
  offset: 0,
};

function createDeveloperDashboardFetch(options?: {
  onExport?: () => void;
  onExportBody?: (body: unknown) => void;
  onDatasetUpdateBody?: (body: unknown) => void;
  datasets?: unknown[];
}): typeof globalThis.fetch {
  const onExport = options?.onExport;
  const onExportBody = options?.onExportBody;
  const onDatasetUpdateBody = options?.onDatasetUpdateBody;
  const datasets = options?.datasets ?? [];

  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.includes("/developer-dashboard/overview")) {
      return new Response(JSON.stringify({
        highlightedFamilies: {
          mobilenetv2: null,
          mobilenetv3: null,
        },
        latestRuns: [],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/developer-dashboard/datasets/export")) {
      onExport?.();
      if (typeof init?.body === "string") {
        onExportBody?.(JSON.parse(init.body as string) as unknown);
      }
      return new Response(new Blob(["zip-bytes"], { type: "application/zip" }), {
        status: 200,
      });
    }

    if (url.includes("/developer-dashboard/datasets/") && url.includes("/manual-classification") && init?.method === "PATCH") {
      const pathParts = new URL(url).pathname.split("/").filter(Boolean);
      const inspectionId = pathParts[pathParts.length - 2] ?? "inspection-unknown";
      let manualClassification = "fresh";
      if (typeof init?.body === "string") {
        const parsed = JSON.parse(init.body as string) as { manualClassification?: unknown };
        onDatasetUpdateBody?.(parsed);
        if (typeof parsed.manualClassification === "string") {
          manualClassification = parsed.manualClassification;
        }
      }

      return new Response(JSON.stringify({
        id: inspectionId,
        user_id: "inspector-1",
        meat_type: "beef",
        classification: "fresh",
        manual_classification: manualClassification,
        confidence_score: 100,
        flagged_deviations: [],
        explanation: null,
        image_url: null,
        location: "North Market",
        inspector_notes: null,
        created_at: "2026-07-13T00:00:00.000Z",
        updated_at: "2026-07-13T00:00:00.000Z",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/developer-dashboard/datasets")) {
      return new Response(JSON.stringify({
        items: datasets,
        total: datasets.length,
        limit: 25,
        offset: 0,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/developer-dashboard/training-runs")) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unexpected request" }), { status: 404 });
  }) as typeof globalThis.fetch;
}

test("developer workspace renders the four internal tabs", async () => {
  const { container, cleanup } = installDom();
  const originalFetch = globalThis.fetch;
  const root: Root = createRoot(container);

  try {
    globalThis.fetch = createDeveloperDashboardFetch();
    const { default: DeveloperTabContent } = await import("../src/pages/admin-dashboard/components/tab-content/DeveloperTabContent");

    await act(async () => {
      root.render(<DeveloperTabContent />);
    });
    await flushEffects();

    const tabLabels = Array.from(document.querySelectorAll('[role="tab"]'))
      .map((tab) => tab.textContent?.trim());

    assert.deepEqual(tabLabels, [
      "Overview",
      "Developer Settings",
      "Datasets",
      "Training",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    await act(async () => {
      root.unmount();
    });
    cleanup();
  }
});

test("dataset export button calls the developer dashboard export endpoint", async () => {
  const { container, cleanup } = installDom();
  const originalFetch = globalThis.fetch;
  const root: Root = createRoot(container);
  let exportCalls = 0;

  try {
    globalThis.fetch = createDeveloperDashboardFetch({
      onExport: () => {
        exportCalls += 1;
      },
    });
    const { default: DeveloperTabContent } = await import("../src/pages/admin-dashboard/components/tab-content/DeveloperTabContent");

    await act(async () => {
      root.render(<DeveloperTabContent />);
    });
    await flushEffects();

    await act(async () => {
      activateRadixTab("Datasets");
    });
    await flushEffects();

    await act(async () => {
      getButtonByName("Export Dataset").click();
    });
    await flushEffects();

    assert.equal(exportCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    await act(async () => {
      root.unmount();
    });
    cleanup();
  }
});

test("developer datasets show confidence scores as raw percentages", async () => {
  const { container, cleanup } = installDom();
  const originalFetch = globalThis.fetch;
  const root: Root = createRoot(container);

  try {
    globalThis.fetch = createDeveloperDashboardFetch({ datasets: developerDatasetRows });
    const { default: DeveloperTabContent } = await import("../src/pages/admin-dashboard/components/tab-content/DeveloperTabContent");

    await act(async () => {
      root.render(<DeveloperTabContent />);
    });
    await flushEffects();

    await act(async () => {
      activateRadixTab("Datasets");
    });
    await flushEffects();
    await flushEffects();

    const confidenceCells = Array.from(document.querySelectorAll("td"))
      .map((cell) => cell.textContent?.trim())
      .filter((value): value is string => Boolean(value));

    assert.ok(confidenceCells.includes("100.00%"));
    assert.ok(confidenceCells.includes("88.00%"));
    assert.ok(!confidenceCells.includes("10000%"));
    assert.ok(!confidenceCells.includes("8800%"));
  } finally {
    globalThis.fetch = originalFetch;
    await act(async () => {
      root.unmount();
    });
    cleanup();
  }
});

test("developer dataset manual classification can be changed and cleared locally", async () => {
  const { container, cleanup } = installDom();
  const root: Root = createRoot(container);

  try {
    function Harness() {
      const [datasets, setDatasets] = React.useState<DeveloperDatasetListResponse>(singleDeveloperDatasetPage);

      return (
        <DeveloperDatasetsSection
          datasets={datasets}
          filters={DEFAULT_DEVELOPER_DATASET_FILTERS}
          onFiltersChange={() => undefined}
          onManualClassificationChange={(inspectionId, classification) => {
            setDatasets((current) => ({
              ...current,
              items: current.items.map((item) => (
                item.id === inspectionId
                  ? { ...item, manual_classification: classification }
                  : item
              )),
            }));
          }}
          onPageChange={() => undefined}
          onExport={async () => undefined}
          isExporting={false}
          isLoading={false}
        />
      );
    }

    await act(async () => {
      root.render(<Harness />);
    });
    await flushEffects();

    const select = document.querySelector(
      'select[aria-label="Manual classification for inspection dataset-1"]',
    ) as HTMLSelectElement | null;
    assert.ok(select, "Expected manual classification select for dataset-1");
    assert.equal(select?.value, "fresh");

    await act(async () => {
      (select as HTMLSelectElement).value = "spoiled";
      (select as HTMLSelectElement).dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flushEffects();

    const updatedSelect = document.querySelector(
      'select[aria-label="Manual classification for inspection dataset-1"]',
    ) as HTMLSelectElement | null;
    assert.equal(updatedSelect?.value, "spoiled");
    assert.ok(
      document.querySelector('button[aria-label="Reset manual classification for inspection dataset-1"]'),
      "Expected reset control after changing the manual classification",
    );

    const resetButton = document.querySelector(
      'button[aria-label="Reset manual classification for inspection dataset-1"]',
    ) as HTMLButtonElement | null;
    assert.ok(resetButton, "Expected reset manual classification button for dataset-1");

    await act(async () => {
      resetButton?.click();
    });
    await flushEffects();

    const resetSelect = document.querySelector(
      'select[aria-label="Manual classification for inspection dataset-1"]',
    ) as HTMLSelectElement | null;
    assert.equal(resetSelect?.value, "fresh");
    assert.equal(
      document.querySelector('button[aria-label="Reset manual classification for inspection dataset-1"]'),
      null,
    );
  } finally {
    await act(async () => {
      root.unmount();
    });
    cleanup();
  }
});

test("developer dataset manual classification updates through the client", async () => {
  const { cleanup } = installDom();
  const originalFetch = globalThis.fetch;
  let updateBody: unknown = null;

  try {
    globalThis.fetch = createDeveloperDashboardFetch({
      onDatasetUpdateBody: (body) => {
        updateBody = body;
      },
    });
    const updatedInspection = await developerDashboardClient.updateDatasetManualClassification(
      "inspection-1",
      "spoiled",
    );

    assert.deepEqual(updateBody, {
      manualClassification: "spoiled",
    });
    assert.equal(updatedInspection.manual_classification, "spoiled");
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});

test("developer dataset export sends filters only", async () => {
  const { cleanup } = installDom();
  const originalFetch = globalThis.fetch;
  let exportBody: unknown = null;

  try {
    globalThis.fetch = createDeveloperDashboardFetch({
      onExportBody: (body) => {
        exportBody = body;
      },
    });
    await developerDashboardClient.exportDatasets(DEFAULT_DEVELOPER_DATASET_FILTERS);

    assert.deepEqual(exportBody, {
      limit: "25",
      offset: "0",
    });
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});
