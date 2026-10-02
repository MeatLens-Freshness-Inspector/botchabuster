import assert from "node:assert/strict";
import test from "node:test";
import type {
  DatasetExportMetadataRecord,
  DatasetExportMetadataRepository,
  DatasetExportStorageAdapter,
} from "../../../src/modules/developer/infrastructure/DeveloperDatasetExportStore";

process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";

const NOW = Date.parse("2026-10-02T00:00:00.000Z");

async function createFakes() {
  const { DATASET_EXPORT_RETENTION_MS, DeveloperDatasetExportStore } = await import(
    "../../../src/modules/developer/infrastructure/DeveloperDatasetExportStore"
  );
  const records = new Map<string, DatasetExportMetadataRecord>();
  const uploads: Array<{ localPath: string; storagePath: string }> = [];
  const removals: string[] = [];
  const signedUrls: Array<{ storagePath: string; expiresInSeconds: number; filename: string }> = [];

  const metadata: DatasetExportMetadataRepository = {
    async insert(record) {
      records.set(record.exportId, { ...record });
    },
    async list(ownerId) {
      return [...records.values()].filter((record) => record.ownerId === ownerId);
    },
    async find(ownerId, exportId) {
      const record = records.get(exportId);
      return record?.ownerId === ownerId ? { ...record } : null;
    },
    async update(exportId, patch) {
      const record = records.get(exportId);
      if (!record) throw new Error("record not found");
      records.set(exportId, { ...record, ...patch });
    },
    async incrementDownloadCount(exportId, downloadedAt) {
      const record = records.get(exportId);
      if (!record) throw new Error("record not found");
      records.set(exportId, {
        ...record,
        downloadCount: record.downloadCount + 1,
        lastDownloadedAt: downloadedAt,
      });
    },
    async setDownloadToken(exportId, tokenHash, expiresAt) {
      const record = records.get(exportId);
      if (!record) throw new Error("record not found");
      records.set(exportId, { ...record, downloadTokenHash: tokenHash, downloadTokenExpiresAt: expiresAt });
    },
    async findByDownloadToken(exportId, tokenHash) {
      const record = records.get(exportId);
      return record?.downloadTokenHash === tokenHash ? { ...record } : null;
    },
  };

  const storage: DatasetExportStorageAdapter = {
    async uploadFile(localPath, storagePath) {
      uploads.push({ localPath, storagePath });
    },
    async removeFile(storagePath) {
      removals.push(storagePath);
    },
    async createSignedUrl(storagePath, expiresInSeconds, filename) {
      signedUrls.push({ storagePath, expiresInSeconds, filename });
      return `https://storage.example.test/${storagePath}?download=${encodeURIComponent(filename)}`;
    },
    async streamFile(_storagePath, onChunk) {
      await onChunk(new Uint8Array([1, 2]));
      await onChunk(new Uint8Array([3, 4]));
    },
  };

  return {
    records,
    uploads,
    removals,
    signedUrls,
    store: new DeveloperDatasetExportStore({ metadata, storage, now: () => NOW }),
  };
}

test("completed exports are persisted with a two-day expiry and can be downloaded by their owner", async () => {
  const { store, records, uploads, signedUrls } = await createFakes();
  const { DATASET_EXPORT_RETENTION_MS } = await import(
    "../../../src/modules/developer/infrastructure/DeveloperDatasetExportStore"
  );

  await store.saveCompletedExport({
    exportId: "export-1",
    ownerId: "owner-1",
    filename: "dataset.zip",
    archivePath: "C:/tmp/dataset.zip",
    size: 4096,
    recordCount: 27,
    filters: { meatType: "pork" },
    createdAt: "2026-10-01T23:55:00.000Z",
  });

  const record = records.get("export-1");
  assert.ok(record);
  assert.equal(record.status, "ready");
  assert.equal(record.expiresAt, new Date(NOW + DATASET_EXPORT_RETENTION_MS).toISOString());
  assert.deepEqual(uploads, [{ localPath: "C:/tmp/dataset.zip", storagePath: "export-1/dataset.zip" }]);

  const history = await store.listExports("owner-1");
  assert.deepEqual(history, [{
    exportId: "export-1",
    status: "ready",
    filename: "dataset.zip",
    size: 4096,
    recordCount: 27,
    filters: { meatType: "pork" },
    createdAt: "2026-10-01T23:55:00.000Z",
    readyAt: new Date(NOW).toISOString(),
    expiresAt: new Date(NOW + DATASET_EXPORT_RETENTION_MS).toISOString(),
    downloadCount: 0,
    lastDownloadedAt: null,
    error: null,
  }]);

  const download = await store.createSignedDownloadUrl("export-1", "owner-1");
  assert.equal(download.filename, "dataset.zip");
  assert.match(download.url, /storage\.example\.test\/export-1\/dataset\.zip/);
  assert.equal(signedUrls[0]?.expiresInSeconds, 15 * 60);
  assert.equal(records.get("export-1")?.downloadCount, 1);
});

test("expired exports are marked unavailable, cleaned up, and cannot be downloaded by another owner", async () => {
  const { store, records, removals } = await createFakes();
  const { DATASET_EXPORT_RETENTION_MS, DeveloperDatasetExportStore } = await import(
    "../../../src/modules/developer/infrastructure/DeveloperDatasetExportStore"
  );
  await store.saveCompletedExport({
    exportId: "export-2",
    ownerId: "owner-1",
    filename: "expired.zip",
    archivePath: "C:/tmp/expired.zip",
    size: 12,
    recordCount: 1,
    filters: {},
  });

  const expiredAt = NOW + DATASET_EXPORT_RETENTION_MS + 1;
  const expiredStore = new DeveloperDatasetExportStore({
    metadata: {
      async insert(record) { records.set(record.exportId, { ...record }); },
      async list(ownerId) { return [...records.values()].filter((record) => record.ownerId === ownerId); },
      async find(ownerId, exportId) {
        const record = records.get(exportId);
        return record?.ownerId === ownerId ? { ...record } : null;
      },
      async update(exportId, patch) {
        const record = records.get(exportId);
        if (!record) throw new Error("record not found");
        records.set(exportId, { ...record, ...patch });
      },
      async incrementDownloadCount() { throw new Error("should not increment expired exports"); },
    },
    storage: {
      async uploadFile() {},
      async removeFile(storagePath) { removals.push(storagePath); },
      async createSignedUrl() { throw new Error("should not sign expired exports"); },
    },
    now: () => expiredAt,
  });

  const history = await expiredStore.listExports("owner-1");
  assert.equal(history[0]?.status, "expired");
  assert.deepEqual(removals, ["export-2/expired.zip"]);
  await assert.rejects(
    () => expiredStore.createSignedDownloadUrl("export-2", "owner-1"),
    /expired/,
  );
  await assert.rejects(
    () => expiredStore.createSignedDownloadUrl("export-2", "owner-2"),
    /not found/,
  );
  assert.equal(records.get("export-2")?.status, "expired");
});

test("failed exports remain visible in history without creating a storage object", async () => {
  const { store, records, uploads } = await createFakes();
  const { DATASET_EXPORT_RETENTION_MS } = await import(
    "../../../src/modules/developer/infrastructure/DeveloperDatasetExportStore"
  );

  await store.saveFailedExport({
    exportId: "export-3",
    ownerId: "owner-1",
    filters: { location: "market" },
    error: "image download failed",
    createdAt: "2026-10-02T00:00:00.000Z",
  });

  assert.equal(uploads.length, 0);
  assert.equal(records.get("export-3")?.status, "failed");
  assert.deepEqual(await store.listExports("owner-1"), [{
    exportId: "export-3",
    status: "failed",
    filename: null,
    size: null,
    recordCount: null,
    filters: { location: "market" },
    createdAt: "2026-10-02T00:00:00.000Z",
    readyAt: null,
    expiresAt: new Date(NOW + DATASET_EXPORT_RETENTION_MS).toISOString(),
    downloadCount: 0,
    lastDownloadedAt: null,
    error: "image download failed",
  }]);
});

test("large exports use a short-lived app token and stream stored chunks without a signed single object", async () => {
  const { store } = await createFakes();
  await store.saveCompletedExport({
    exportId: "export-stream",
    ownerId: "owner-1",
    filename: "streamed.zip",
    archivePath: "C:/tmp/streamed.zip",
    size: 4,
    recordCount: 2,
    filters: {},
  });

  const access = await store.createDownloadAccess("export-stream", "owner-1");
  assert.ok(access.token.length >= 32);
  assert.equal(access.filename, "streamed.zip");

  const archive = await store.getArchiveForDownload("export-stream", access.token);
  const chunks: number[] = [];
  await store.streamArchive(archive, async (chunk) => chunks.push(...chunk));
  assert.deepEqual(chunks, [1, 2, 3, 4]);
  await assert.rejects(
    () => store.getArchiveForDownload("export-stream", "not-the-token"),
    /invalid/,
  );
});
