import assert from "node:assert/strict";
import test from "node:test";
import {
  developerDashboardClient,
  DEFAULT_DEVELOPER_DATASET_FILTERS,
  type DeveloperDatasetExportHistoryItem,
} from "../../../src/entities/developer-metrics";
import { installEncryptedFetch } from "../../support/encrypted-fetch";

test("developer dataset export polls to completion without requesting or buffering the ZIP", async () => {
  const events: string[] = [];
  let progressRequests = 0;
  const restoreTransportFetch = installEncryptedFetch(({ input }) => {
    const url = String(input);
    events.push(url);
    if (url.includes("/export/start")) {
      return new Response(JSON.stringify({ exportId: "export-ready" }), { status: 202 });
    }
    if (url.includes("/export/export-ready/progress")) {
      progressRequests += 1;
      return new Response(JSON.stringify(
        progressRequests === 1
          ? { status: "running", stage: "downloading-images", current: 1, total: 3 }
          : { status: "completed", stage: "complete", current: 1, total: 1 },
      ), { status: 200 });
    }
    throw new Error(`unexpected export request: ${url}`);
  });

  try {
    const exportId = await developerDashboardClient.exportDatasets(
      DEFAULT_DEVELOPER_DATASET_FILTERS,
    );

    assert.equal(exportId, "export-ready");
    assert.equal(events.some((url) => url.endsWith("/download")), false);
  } finally {
    restoreTransportFetch();
  }
});

test("developer dataset export forwards progress while the server assembles the archive", async () => {
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
    throw new Error(`unexpected export request: ${url}`);
  });

  try {
    await developerDashboardClient.exportDatasets(
      DEFAULT_DEVELOPER_DATASET_FILTERS,
      (update) => progress.push(`${update.stage}:${update.current}/${update.total}`),
    );

    assert.deepEqual(progress, ["downloading-images:1/3", "complete:1/1"]);
  } finally {
    restoreTransportFetch();
  }
});

test("developer dataset export history returns records and signed download URLs", async () => {
  const history: DeveloperDatasetExportHistoryItem[] = [{
    exportId: "export-history",
    status: "ready",
    filename: "dataset.zip",
    size: 123,
    recordCount: 4,
    filters: {},
    createdAt: "2026-10-02T00:00:00.000Z",
    readyAt: "2026-10-02T00:01:00.000Z",
    expiresAt: "2026-10-04T00:01:00.000Z",
    downloadCount: 0,
    lastDownloadedAt: null,
    error: null,
  }];
  const restoreTransportFetch = installEncryptedFetch(({ input, method }) => {
    const url = String(input);
    if (url.endsWith("/datasets/exports")) {
      return new Response(JSON.stringify(history), { status: 200 });
    }
    if (url.endsWith("/download-url")) {
      assert.equal(method, "POST");
      return new Response(JSON.stringify({
        url: "https://storage.example.test/export-history/dataset.zip?download=dataset.zip",
        filename: "dataset.zip",
      }), { status: 200 });
    }
    throw new Error(`unexpected history request: ${url}`);
  });

  try {
    assert.deepEqual(await developerDashboardClient.listDatasetExports(), history);
    assert.deepEqual(
      await developerDashboardClient.getDatasetExportDownloadUrl("export-history"),
      {
        url: "https://storage.example.test/export-history/dataset.zip?download=dataset.zip",
        filename: "dataset.zip",
      },
    );
  } finally {
    restoreTransportFetch();
  }
});
