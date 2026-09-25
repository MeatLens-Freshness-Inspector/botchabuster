import assert from "node:assert/strict";
import test from "node:test";

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { InspectionDisputeSection } from "../../../src/features/inspection-disputes/ui/inspection-dispute-section";

Object.assign(globalThis, { React });

type RenderProps = React.ComponentProps<typeof InspectionDisputeSection>;

async function renderSection(dom: JSDOM, props: RenderProps) {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<InspectionDisputeSection {...props} />);
  });
  return { container, root };
}

function installDom(dom: JSDOM) {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousHTMLElement = globalThis.HTMLElement;
  const previousActEnvironment = (globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }).IS_REACT_ACT_ENVIRONMENT;

  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: dom.window.HTMLElement });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });

  return () => {
    Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
    Object.defineProperty(globalThis, "document", { configurable: true, value: previousDocument });
    Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: previousHTMLElement });
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
      configurable: true,
      value: previousActEnvironment,
    });
  };
}

test("Inspect-tab dispute section stays hidden before an inspection is saved", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const restoreDom = installDom(dom);
  const { root, container } = await renderSection(dom, {
    inspectionId: null,
    classification: "fresh",
    isSubmitting: false,
    isSubmitted: false,
    onSubmit: () => undefined,
  });

  try {
    assert.equal(container.textContent?.includes("Dispute result"), false);
  } finally {
    await act(async () => root.unmount());
    restoreDom();
    dom.window.close();
  }
});

test("Inspect-tab dispute section submits the selected result and reason", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const restoreDom = installDom(dom);
  const submissions: Array<{ expectedClassification: string; reason: string }> = [];
  const { root, container } = await renderSection(dom, {
    inspectionId: "inspection-1",
    classification: "fresh",
    isSubmitting: false,
    isSubmitted: false,
    onSubmit: (input) => submissions.push(input),
  });

  try {
    const actionButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Dispute result"),
    );
    assert.ok(actionButton);

    await act(async () => {
      actionButton.click();
    });

    const select = container.querySelector("select");
    const reason = container.querySelector("textarea");
    const form = container.querySelector("form");
    assert.ok(select);
    assert.ok(reason);
    assert.ok(form);

    await act(async () => {
      select.value = "spoiled";
      select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
      Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, "value")?.set?.call(
        reason,
        "  The sample shows visible spoilage.  ",
      );
      reason.dispatchEvent(new dom.window.InputEvent("input", { bubbles: true, inputType: "insertText" }));
      reason.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
    });

    assert.deepEqual(submissions, [{
      expectedClassification: "spoiled",
      reason: "The sample shows visible spoilage.",
    }]);
  } finally {
    await act(async () => root.unmount());
    restoreDom();
    dom.window.close();
  }
});

test("Inspect-tab dispute section confirms a submitted dispute", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const restoreDom = installDom(dom);
  const { root, container } = await renderSection(dom, {
    inspectionId: "inspection-1",
    classification: "fresh",
    isSubmitting: false,
    isSubmitted: true,
    onSubmit: () => undefined,
  });

  try {
    assert.match(container.textContent ?? "", /Pending review/);
  } finally {
    await act(async () => root.unmount());
    restoreDom();
    dom.window.close();
  }
});
