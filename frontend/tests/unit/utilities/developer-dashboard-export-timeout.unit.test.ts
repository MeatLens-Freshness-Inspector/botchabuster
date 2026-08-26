import assert from "node:assert/strict";
import test from "node:test";
import { developerDashboardClient, DEFAULT_DEVELOPER_DATASET_FILTERS } from "../../../src/entities/developer-metrics";

test("developer dataset export uses a longer timeout than uploads", async () => {
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const recordedTimeouts: number[] = [];

  globalThis.setTimeout = ((callback: TimerHandler, delay?: number) => {
    recordedTimeouts.push(typeof delay === "number" ? delay : 0);
    return 1 as unknown as ReturnType<typeof globalThis.setTimeout>;
  }) as typeof globalThis.setTimeout;
  globalThis.clearTimeout = (() => undefined) as typeof globalThis.clearTimeout;
  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url.includes("/export/start")) {
      return new Response(JSON.stringify({ exportId: "export-1" }), { status: 202 });
    }
    if (url.includes("/export/export-1/progress")) {
      return new Response(JSON.stringify({ status: "completed", stage: "complete", current: 1, total: 1 }), { status: 200 });
    }
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "Content-Type": "application/zip" },
    });
  }) as typeof globalThis.fetch;

  try {
    await developerDashboardClient.exportDatasets(DEFAULT_DEVELOPER_DATASET_FILTERS);
    assert.ok(recordedTimeouts.length >= 3);
    assert.ok(
      recordedTimeouts.some((timeout) => timeout > 30_000),
      `expected download timeout to exceed 30s, got ${recordedTimeouts.join(", ")}`,
    );
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("developer dataset export forwards session progress before downloading the ZIP", async () => {
  const originalFetch = globalThis.fetch;
  const progress: string[] = [];
  let progressRequests = 0;

  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url.includes("/export/start")) {
      return new Response(JSON.stringify({ exportId: "export-progress" }), { status: 202 });
    }
    if (url.includes("/export/export-progress/progress")) {
      progressRequests += 1;
      return new Response(JSON.stringify(
        progressRequests === 1
          ? { status: "running", stage: "downloading-images", current: 1, total: 3 }
          : { status: "completed", stage: "complete", current: 1, total: 1 },
      ), { status: 200 });
    }
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "Content-Type": "application/zip" },
    });
  }) as typeof globalThis.fetch;

  try {
    const exported = await developerDashboardClient.exportDatasets(
      DEFAULT_DEVELOPER_DATASET_FILTERS,
      (update) => progress.push(`${update.stage}:${update.current}/${update.total}`),
    );

    assert.equal(await exported.arrayBuffer().then((bytes) => bytes.byteLength), 3);
    assert.deepEqual(progress, ["downloading-images:1/3", "complete:1/1"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
