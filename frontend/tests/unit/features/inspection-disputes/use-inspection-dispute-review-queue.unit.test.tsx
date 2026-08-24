import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { InspectionResultDispute } from "../../../../src/entities/inspection";
import { useInspectionDisputeReviewQueue } from "../../../../src/features/inspection-disputes/model/use-inspection-dispute-review-queue";

type HookState = ReturnType<typeof useInspectionDisputeReviewQueue>;

const dispute: InspectionResultDispute = {
  id: "dispute-1",
  inspection_id: "inspection-1",
  submitted_by: "inspector-1",
  expected_classification: "spoiled",
  reason: "The sample has clear spoilage indicators.",
  status: "pending",
  developer_label_applied_at: null,
  developer_label_applied_by: null,
  reviewed_at: null,
  reviewed_by: null,
  reviewer_note: null,
  created_at: "2026-08-24T00:00:00.000Z",
  updated_at: "2026-08-24T00:00:00.000Z",
};

test("review queue loads pending disputes and removes a reviewed dispute", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousFetch = globalThis.fetch;
  const previousActEnvironment = (globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }).IS_REACT_ACT_ENVIRONMENT;
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });

  const requests: Array<{ url: string; method: string }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    requests.push({ url, method });
    if (method === "GET") {
      return new Response(JSON.stringify([dispute]), { status: 200 });
    }
    return new Response(JSON.stringify({
      dispute: { ...dispute, status: "approved" },
      inspection: { id: "inspection-1", classification: "fresh" },
    }), { status: 200 });
  }) as typeof fetch;

  let latest: HookState | null = null;
  function Harness() {
    latest = useInspectionDisputeReviewQueue();
    return null;
  }

  const root: Root = createRoot(container);
  try {
    await act(async () => {
      root.render(<Harness />);
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    assert.equal(latest?.disputes.length, 1);
    assert.equal(requests.filter((request) => request.method === "GET").length, 1);

    await act(async () => {
      await latest?.reviewDispute("dispute-1", "approved", null);
    });

    assert.equal(latest?.disputes.length, 0);
    assert.equal(requests.some((request) => request.url.includes("/review") && request.method === "POST"), true);
  } finally {
    await act(async () => root.unmount());
    Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
    Object.defineProperty(globalThis, "document", { configurable: true, value: previousDocument });
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
      configurable: true,
      value: previousActEnvironment,
    });
    globalThis.fetch = previousFetch;
    dom.window.close();
  }
});
