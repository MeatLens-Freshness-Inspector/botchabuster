import assert from "node:assert/strict";
import test from "node:test";
import { developerDashboardClient, DEFAULT_DEVELOPER_DATASET_FILTERS } from "../../../src/entities/developer-metrics";
import { installEncryptedFetch } from "../../support/encrypted-fetch";

test("developer dataset export uses a longer timeout than uploads", async () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const recordedTimeouts: number[] = [];

  globalThis.setTimeout = ((callback: TimerHandler, delay?: number) => {
    recordedTimeouts.push(typeof delay === "number" ? delay : 0);
    return 1 as unknown as ReturnType<typeof globalThis.setTimeout>;
  }) as typeof globalThis.setTimeout;
  globalThis.clearTimeout = (() => undefined) as typeof globalThis.clearTimeout;
  const restoreTransportFetch = installEncryptedFetch(({ input }) => {
    const url = String(input);
    if (url.includes("/export/start")) {
      return new Response(JSON.stringify({ exportId: "export-1" }), { status: 202 });
    }
    if (url.includes("/export/export-1/progress")) {
      return new Response(JSON.stringify({ status: "completed", stage: "complete", current: 1, total: 1 }), { status: 200 });
    }
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "Content-Type": "text/event-stream; charset=utf-8", "X-Export-Content-Length": "3" },
    });
  });

  try {
    await developerDashboardClient.exportDatasets(DEFAULT_DEVELOPER_DATASET_FILTERS);
    assert.ok(recordedTimeouts.length >= 3);
    assert.ok(
      recordedTimeouts.some((timeout) => timeout > 30_000),
      `expected download timeout to exceed 30s, got ${recordedTimeouts.join(", ")}`,
    );
  } finally {
    restoreTransportFetch();
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("developer dataset export forwards session progress before downloading the ZIP", async () => {
  const progress: string[] = [];
  let progressRequests = 0;

  const restoreTransportFetch = installEncryptedFetch(({ input }) => {
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
      headers: { "Content-Type": "text/event-stream; charset=utf-8", "X-Export-Content-Length": "3" },
    });
  });

  try {
    const exported = await developerDashboardClient.exportDatasets(
      DEFAULT_DEVELOPER_DATASET_FILTERS,
      (update) => progress.push(`${update.stage}:${update.current}/${update.total}`),
    );

    assert.ok(exported instanceof Blob);
    assert.equal(await exported.arrayBuffer().then((bytes) => bytes.byteLength), 3);
    assert.deepEqual(progress, ["downloading-images:1/3", "complete:1/1"]);
  } finally {
    restoreTransportFetch();
  }
});

test("developer dataset export streams the ZIP to the chosen file instead of creating a Blob", async () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const events: string[] = [];
  const downloadedBytes: number[] = [];
  const writable = new WritableStream<Uint8Array>({
    write(chunk) {
      downloadedBytes.push(...chunk);
    },
  });

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      showSaveFilePicker: async () => {
        events.push("pick-file");
        return { createWritable: async () => writable };
      },
    },
  });

  const restoreTransportFetch = installEncryptedFetch(({ input }) => {
    events.push("request");
    const url = String(input);
    if (url.includes("/export/start")) {
      return new Response(JSON.stringify({ exportId: "export-file" }), { status: 202 });
    }
    if (url.includes("/export/export-file/progress")) {
      return new Response(JSON.stringify({ status: "completed", stage: "complete", current: 1, total: 1 }), { status: 200 });
    }
    return new Response(new Uint8Array([4, 5, 6]), {
      status: 200,
      headers: { "Content-Type": "text/event-stream; charset=utf-8", "X-Export-Content-Length": "3" },
    });
  });

  try {
    const exported = await developerDashboardClient.exportDatasets(DEFAULT_DEVELOPER_DATASET_FILTERS);

    assert.equal(exported, null);
    assert.equal(events[0], "pick-file");
    assert.deepEqual(downloadedBytes, [4, 5, 6]);
  } finally {
    restoreTransportFetch();
    if (previousWindow) {
      Object.defineProperty(globalThis, "window", previousWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
});

test("developer dataset export refuses to buffer a large file when direct-to-disk saving is unavailable", async () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  const restoreTransportFetch = installEncryptedFetch(({ input }) => {
    const url = String(input);
    if (url.includes("/export/start")) {
      return new Response(JSON.stringify({ exportId: "export-large" }), { status: 202 });
    }
    if (url.includes("/export/export-large/progress")) {
      return new Response(JSON.stringify({ status: "completed", stage: "complete", current: 1, total: 1 }), { status: 200 });
    }
    return new Response(new Uint8Array([1]), {
      status: 200,
      headers: { "Content-Type": "text/event-stream; charset=utf-8", "X-Export-Content-Length": String(60 * 1024 * 1024) },
    });
  });

  try {
    await assert.rejects(
      () => developerDashboardClient.exportDatasets(DEFAULT_DEVELOPER_DATASET_FILTERS),
      /Use Chrome or Edge to download it without buffering the ZIP/,
    );
  } finally {
    restoreTransportFetch();
    if (previousWindow) {
      Object.defineProperty(globalThis, "window", previousWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
});

test("developer dataset export permits a small buffered fallback using the encrypted-stream size header", async () => {
  const restoreTransportFetch = installEncryptedFetch(({ input }) => {
    const url = String(input);
    if (url.includes("/export/start")) {
      return new Response(JSON.stringify({ exportId: "export-small" }), { status: 202 });
    }
    if (url.includes("/export/export-small/progress")) {
      return new Response(JSON.stringify({ status: "completed", stage: "complete", current: 1, total: 1 }), { status: 200 });
    }
    return new Response(new Uint8Array([4, 5, 6]), {
      status: 200,
      headers: { "Content-Type": "text/event-stream; charset=utf-8", "X-Export-Content-Length": "3" },
    });
  });

  try {
    const exported = await developerDashboardClient.exportDatasets(DEFAULT_DEVELOPER_DATASET_FILTERS);

    assert.ok(exported instanceof Blob);
    assert.deepEqual(Array.from(new Uint8Array(await exported.arrayBuffer())), [4, 5, 6]);
  } finally {
    restoreTransportFetch();
  }
});
