import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import type { InspectionResultDispute } from "../../../../src/entities/inspection";
import { InspectionDisputeReviewSection } from "../../../../src/features/developer-tools";

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

test("admin review surface hides the developer-only label action", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousHTMLElement = globalThis.HTMLElement;
  const previousActEnvironment = (globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }).IS_REACT_ACT_ENVIRONMENT;
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: dom.window.HTMLElement });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        <InspectionDisputeReviewSection
          disputes={[dispute]}
          isLoading={false}
          canApplyDeveloperLabel={false}
          onApplyDeveloperLabel={async () => undefined}
          onReview={async () => undefined}
        />,
      );
    });

    assert.equal(document.body.textContent?.includes("Apply developer label"), false);
    assert.equal(document.body.textContent?.includes("Approve official result"), true);
  } finally {
    await act(async () => root.unmount());
    Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
    Object.defineProperty(globalThis, "document", { configurable: true, value: previousDocument });
    Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: previousHTMLElement });
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
      configurable: true,
      value: previousActEnvironment,
    });
    dom.window.close();
  }
});
