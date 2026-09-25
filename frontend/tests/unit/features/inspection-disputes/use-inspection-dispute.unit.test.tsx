import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useInspectionDispute } from "../../../../src/features/inspection-disputes/model/use-inspection-dispute";
import { installEncryptedFetch } from "../../../support/encrypted-fetch";

type HookState = ReturnType<typeof useInspectionDispute>;

test("inspection dispute ignores a response for an inspection that is no longer active", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousActEnvironment = (globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }).IS_REACT_ACT_ENVIRONMENT;
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });

  let resolveResponse: ((response: Response) => void) | null = null;
  const responsePromise = new Promise<Response>((resolve) => {
    resolveResponse = resolve;
  });
  const restoreFetch = installEncryptedFetch(() => responsePromise);
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  let latest: HookState | null = null;
  function Harness() {
    latest = useInspectionDispute();
    return null;
  }

  const root: Root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Harness />
        </QueryClientProvider>,
      );
    });

    await act(async () => {
      latest?.setSavedInspectionId("inspection-1");
    });

    let submitPromise: Promise<void> | undefined;
    await act(async () => {
      submitPromise = latest?.onSubmit({
        expectedClassification: "spoiled",
        reason: "The inspection evidence indicates spoilage.",
      });
    });

    for (let attempt = 0; attempt < 40 && !resolveResponse; attempt += 1) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 25));
      });
    }
    assert.ok(resolveResponse);

    await act(async () => {
      latest?.setSavedInspectionId("inspection-2");
    });

    resolveResponse?.(new Response(JSON.stringify({ id: "dispute-1" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    await act(async () => {
      await submitPromise;
    });

    assert.equal(latest?.savedInspectionId, "inspection-2");
    assert.equal(latest?.isDisputeSubmitted, false);
  } finally {
    await act(async () => root.unmount());
    queryClient.clear();
    restoreFetch();
    Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
    Object.defineProperty(globalThis, "document", { configurable: true, value: previousDocument });
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
      configurable: true,
      value: previousActEnvironment,
    });
    dom.window.close();
  }
});
