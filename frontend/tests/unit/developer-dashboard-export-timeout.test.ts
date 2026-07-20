import assert from "node:assert/strict";
import test from "node:test";
import { developerDashboardClient, DEFAULT_DEVELOPER_DATASET_FILTERS } from "../../src/integrations/api/DeveloperDashboardClient";

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
  globalThis.fetch = (async () =>
    new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "Content-Type": "application/zip" },
    })) as typeof globalThis.fetch;

  try {
    await developerDashboardClient.exportDatasets(DEFAULT_DEVELOPER_DATASET_FILTERS);
    assert.equal(recordedTimeouts.length, 1);
    assert.ok(
      recordedTimeouts[0] > 30_000,
      `expected export timeout to exceed 30s, got ${recordedTimeouts[0]}`,
    );
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});
