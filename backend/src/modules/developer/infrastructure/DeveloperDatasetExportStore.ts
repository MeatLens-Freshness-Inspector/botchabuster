import { createReadStream } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { supabase } from "../../../integrations/supabase";

export const DATASET_EXPORT_RETENTION_MS = 2 * 24 * 60 * 60 * 1000;
const DATASET_EXPORT_BUCKET = "developer-dataset-exports";
const SIGNED_URL_MAX_AGE_SECONDS = 15 * 60;
const DATASET_EXPORT_CHUNK_BYTES = 4 * 1024 * 1024;

export type DatasetExportHistoryStatus = "ready" | "expired" | "failed";

export interface DatasetExportMetadataRecord {
  exportId: string;
  ownerId: string;
  status: DatasetExportHistoryStatus;
  filename: string | null;
  storagePath: string | null;
  size: number | null;
  recordCount: number | null;
  filters: Record<string, unknown>;
  createdAt: string;
  readyAt: string | null;
  expiresAt: string;
  downloadCount: number;
  lastDownloadedAt: string | null;
  error: string | null;
  downloadTokenHash?: string | null;
  downloadTokenExpiresAt?: string | null;
}

export type DatasetExportHistoryItem = Omit<DatasetExportMetadataRecord, "ownerId" | "storagePath">;

export interface DatasetExportMetadataRepository {
  insert(record: DatasetExportMetadataRecord): Promise<void>;
  list(ownerId: string): Promise<DatasetExportMetadataRecord[]>;
  find(ownerId: string, exportId: string): Promise<DatasetExportMetadataRecord | null>;
  update(exportId: string, patch: Partial<DatasetExportMetadataRecord>): Promise<void>;
  incrementDownloadCount(exportId: string, downloadedAt: string): Promise<void>;
  setDownloadToken?(exportId: string, tokenHash: string, expiresAt: string): Promise<void>;
  findByDownloadToken?(exportId: string, tokenHash: string): Promise<DatasetExportMetadataRecord | null>;
}

export interface DatasetExportStorageAdapter {
  uploadFile(localPath: string, storagePath: string): Promise<void>;
  removeFile(storagePath: string): Promise<void>;
  createSignedUrl(storagePath: string, expiresInSeconds: number, filename: string): Promise<string>;
  streamFile?(storagePath: string, onChunk: DatasetExportChunkReader): Promise<void>;
}

export interface DeveloperDatasetExportStoreDependencies {
  metadata: DatasetExportMetadataRepository;
  storage: DatasetExportStorageAdapter;
  now?: () => number;
}

export interface SaveCompletedDatasetExportInput {
  exportId: string;
  ownerId: string;
  filename: string;
  archivePath: string;
  size: number;
  recordCount: number;
  filters: Record<string, unknown>;
  createdAt?: string;
}

export interface SaveFailedDatasetExportInput {
  exportId: string;
  ownerId: string;
  filters: Record<string, unknown>;
  error: string;
  createdAt?: string;
}

export interface DatasetExportDownload {
  url: string;
  filename: string;
}

export interface DatasetExportDownloadAccess {
  token: string;
  filename: string;
}

export interface DatasetExportArchiveMetadata {
  filename: string;
  size: number;
  storagePath: string;
}

export interface DatasetExportHistoryStore {
  saveCompletedExport(input: SaveCompletedDatasetExportInput): Promise<void>;
  saveFailedExport(input: SaveFailedDatasetExportInput): Promise<void>;
  listExports(ownerId: string): Promise<DatasetExportHistoryItem[]>;
  createSignedDownloadUrl(exportId: string, ownerId: string): Promise<DatasetExportDownload>;
  createDownloadAccess(exportId: string, ownerId: string): Promise<DatasetExportDownloadAccess>;
  getArchiveForDownload(exportId: string, token: string): Promise<DatasetExportArchiveMetadata>;
  streamArchive(archive: DatasetExportArchiveMetadata, onChunk: DatasetExportChunkReader): Promise<void>;
}

export interface DatasetExportChunkReader {
  (chunk: Uint8Array): Promise<void>;
}

function toIso(value: number): string {
  return new Date(value).toISOString();
}

function mapRecord(record: DatasetExportMetadataRecord): DatasetExportHistoryItem {
  const {
    ownerId: _ownerId,
    storagePath: _storagePath,
    downloadTokenHash: _downloadTokenHash,
    downloadTokenExpiresAt: _downloadTokenExpiresAt,
    ...historyItem
  } = record;
  return historyItem;
}

function createSupabaseMetadataRepository(): DatasetExportMetadataRepository {
  const table = () => supabase.from("developer_dataset_exports") as any;

  const fromRow = (row: Record<string, unknown>): DatasetExportMetadataRecord => ({
    exportId: String(row.export_id),
    ownerId: String(row.owner_id),
    status: row.status as DatasetExportHistoryStatus,
    filename: typeof row.filename === "string" ? row.filename : null,
    storagePath: typeof row.storage_path === "string" ? row.storage_path : null,
    size: typeof row.size_bytes === "number" ? row.size_bytes : row.size_bytes === null ? null : Number(row.size_bytes),
    recordCount: typeof row.record_count === "number" ? row.record_count : row.record_count === null ? null : Number(row.record_count),
    filters: row.filters && typeof row.filters === "object" ? row.filters as Record<string, unknown> : {},
    createdAt: String(row.created_at),
    readyAt: typeof row.ready_at === "string" ? row.ready_at : null,
    expiresAt: String(row.expires_at),
    downloadCount: Number(row.download_count ?? 0),
    lastDownloadedAt: typeof row.last_downloaded_at === "string" ? row.last_downloaded_at : null,
    error: typeof row.failure_message === "string" ? row.failure_message : null,
    downloadTokenHash: typeof row.download_token_hash === "string" ? row.download_token_hash : null,
    downloadTokenExpiresAt: typeof row.download_token_expires_at === "string" ? row.download_token_expires_at : null,
  });

  return {
    async insert(record) {
      const { error } = await table().insert({
        export_id: record.exportId,
        owner_id: record.ownerId,
        status: record.status,
        filename: record.filename,
        storage_path: record.storagePath,
        size_bytes: record.size,
        record_count: record.recordCount,
        filters: record.filters,
        created_at: record.createdAt,
        ready_at: record.readyAt,
        expires_at: record.expiresAt,
        download_count: record.downloadCount,
        last_downloaded_at: record.lastDownloadedAt,
        failure_message: record.error,
        download_token_hash: record.downloadTokenHash ?? null,
        download_token_expires_at: record.downloadTokenExpiresAt ?? null,
      });
      if (error) throw new Error(`Dataset export metadata insert failed: ${error.message}`);
    },
    async list(ownerId) {
      const { data, error } = await table()
        .select("*")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(`Dataset export metadata list failed: ${error.message}`);
      return (data ?? []).map(fromRow);
    },
    async find(ownerId, exportId) {
      const { data, error } = await table()
        .select("*")
        .eq("owner_id", ownerId)
        .eq("export_id", exportId)
        .maybeSingle();
      if (error) throw new Error(`Dataset export metadata lookup failed: ${error.message}`);
      return data ? fromRow(data) : null;
    },
    async update(exportId, patch) {
      const { error } = await table()
        .update({
          ...(patch.status === undefined ? {} : { status: patch.status }),
          ...(patch.readyAt === undefined ? {} : { ready_at: patch.readyAt }),
          ...(patch.error === undefined ? {} : { failure_message: patch.error }),
        })
        .eq("export_id", exportId);
      if (error) throw new Error(`Dataset export metadata update failed: ${error.message}`);
    },
    async incrementDownloadCount(exportId, downloadedAt) {
      const { data, error: readError } = await table()
        .select("download_count")
        .eq("export_id", exportId)
        .maybeSingle();
      if (readError) throw new Error(`Dataset export download count lookup failed: ${readError.message}`);
      const { error } = await table()
        .update({
          download_count: Number(data?.download_count ?? 0) + 1,
          last_downloaded_at: downloadedAt,
        })
        .eq("export_id", exportId);
      if (error) throw new Error(`Dataset export download count update failed: ${error.message}`);
    },
    async setDownloadToken(exportId, tokenHash, expiresAt) {
      const { error } = await table()
        .update({ download_token_hash: tokenHash, download_token_expires_at: expiresAt })
        .eq("export_id", exportId);
      if (error) throw new Error(`Dataset export download token update failed: ${error.message}`);
    },
    async findByDownloadToken(exportId, tokenHash) {
      const { data, error } = await table()
        .select("*")
        .eq("export_id", exportId)
        .eq("download_token_hash", tokenHash)
        .maybeSingle();
      if (error) throw new Error(`Dataset export download token lookup failed: ${error.message}`);
      return data ? fromRow(data) : null;
    },
  };
}

function createSupabaseStorageAdapter(): DatasetExportStorageAdapter {
  const storage = () => supabase.storage.from(DATASET_EXPORT_BUCKET);

  async function listChunkPaths(storagePath: string): Promise<string[]> {
    const { data, error } = await storage().list(storagePath, {
      limit: 1000,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`Dataset export storage list failed: ${error.message}`);
    return (data ?? [])
      .map((entry) => entry.name)
      .filter((name): name is string => typeof name === "string" && /^part-\d{8}$/.test(name))
      .sort()
      .map((name) => `${storagePath}/${name}`);
  }

  return {
    async uploadFile(localPath, storagePath) {
      let index = 0;
      try {
        for await (const chunk of createReadStream(localPath, { highWaterMark: DATASET_EXPORT_CHUNK_BYTES })) {
          const partPath = `${storagePath}/part-${String(index).padStart(8, "0")}`;
          const { error } = await storage().upload(partPath, chunk as Buffer, {
            contentType: "application/octet-stream",
            cacheControl: String(DATASET_EXPORT_RETENTION_MS / 1000),
            upsert: false,
          });
          if (error) throw new Error(`Dataset export storage upload failed: ${error.message}`);
          index += 1;
        }
      } catch (error) {
        await this.removeFile(storagePath).catch(() => undefined);
        throw error;
      }
    },
    async removeFile(storagePath) {
      const paths = await listChunkPaths(storagePath).catch(() => []);
      const { error } = await storage().remove(paths.length > 0 ? paths : [storagePath]);
      if (error) throw new Error(`Dataset export storage cleanup failed: ${error.message}`);
    },
    async createSignedUrl(storagePath, expiresInSeconds, filename) {
      const { data, error } = await storage()
        .createSignedUrl(storagePath, expiresInSeconds, { download: filename });
      if (error || !data?.signedUrl) {
        throw new Error(`Dataset export signed URL failed: ${error?.message ?? "URL missing"}`);
      }
      return data.signedUrl;
    },
    async streamFile(storagePath, onChunk) {
      const paths = await listChunkPaths(storagePath);
      const downloadPaths = paths.length > 0 ? paths : [storagePath];
      for (const partPath of downloadPaths) {
        const { data, error } = await storage().download(partPath);
        if (error) throw new Error(`Dataset export storage download failed: ${error.message}`);
        await onChunk(new Uint8Array(await data.arrayBuffer()));
      }
    },
  };
}

function createDefaultDependencies(): DeveloperDatasetExportStoreDependencies {
  return {
    metadata: createSupabaseMetadataRepository(),
    storage: createSupabaseStorageAdapter(),
  };
}

export class DeveloperDatasetExportStore implements DatasetExportHistoryStore {
  private readonly now: () => number;

  constructor(private readonly dependencies: DeveloperDatasetExportStoreDependencies = createDefaultDependencies()) {
    this.now = dependencies.now ?? Date.now;
  }

  async saveCompletedExport(input: SaveCompletedDatasetExportInput): Promise<void> {
    const readyAt = this.now();
    const storagePath = `${input.exportId}/${input.filename}`;
    const record: DatasetExportMetadataRecord = {
      exportId: input.exportId,
      ownerId: input.ownerId,
      status: "ready",
      filename: input.filename,
      storagePath,
      size: input.size,
      recordCount: input.recordCount,
      filters: input.filters,
      createdAt: input.createdAt ?? toIso(readyAt),
      readyAt: toIso(readyAt),
      expiresAt: toIso(readyAt + DATASET_EXPORT_RETENTION_MS),
      downloadCount: 0,
      lastDownloadedAt: null,
      error: null,
      downloadTokenHash: null,
      downloadTokenExpiresAt: null,
    };

    await this.dependencies.storage.uploadFile(input.archivePath, storagePath);
    try {
      await this.dependencies.metadata.insert(record);
    } catch (error) {
      await this.dependencies.storage.removeFile(storagePath).catch(() => undefined);
      throw error;
    }
  }

  async saveFailedExport(input: SaveFailedDatasetExportInput): Promise<void> {
    const createdAt = input.createdAt ?? toIso(this.now());
    await this.dependencies.metadata.insert({
      exportId: input.exportId,
      ownerId: input.ownerId,
      status: "failed",
      filename: null,
      storagePath: null,
      size: null,
      recordCount: null,
      filters: input.filters,
      createdAt,
      readyAt: null,
      expiresAt: toIso(Date.parse(createdAt) + DATASET_EXPORT_RETENTION_MS),
      downloadCount: 0,
      lastDownloadedAt: null,
      error: input.error,
      downloadTokenHash: null,
      downloadTokenExpiresAt: null,
    });
  }

  async createDownloadAccess(exportId: string, ownerId: string): Promise<DatasetExportDownloadAccess> {
    const record = await this.dependencies.metadata.find(ownerId, exportId);
    if (!record) throw new Error("Dataset export not found");
    if (record.status !== "ready" || !record.storagePath || !record.filename) {
      throw new Error("Dataset export has expired or is unavailable");
    }

    const remainingSeconds = Math.floor((Date.parse(record.expiresAt) - this.now()) / 1000);
    if (remainingSeconds <= 0) {
      await this.expireRecord(record);
      throw new Error("Dataset export has expired or is unavailable");
    }
    if (!this.dependencies.metadata.setDownloadToken) {
      throw new Error("Dataset export download token persistence is not configured");
    }

    const token = randomBytes(32).toString("base64url");
    const tokenExpiresAt = toIso(this.now() + Math.min(SIGNED_URL_MAX_AGE_SECONDS, remainingSeconds) * 1000);
    await this.dependencies.metadata.setDownloadToken(
      exportId,
      createHash("sha256").update(token).digest("hex"),
      tokenExpiresAt,
    );
    await this.dependencies.metadata.incrementDownloadCount(exportId, toIso(this.now()));
    return { token, filename: record.filename };
  }

  async getArchiveForDownload(exportId: string, token: string): Promise<DatasetExportArchiveMetadata> {
    if (!this.dependencies.metadata.findByDownloadToken) {
      throw new Error("Dataset export download token validation is not configured");
    }

    const record = await this.dependencies.metadata.findByDownloadToken(
      exportId,
      createHash("sha256").update(token).digest("hex"),
    );
    if (!record || record.status !== "ready" || !record.storagePath || !record.filename) {
      throw new Error("Dataset export download token is invalid");
    }
    if (!record.downloadTokenExpiresAt || Date.parse(record.downloadTokenExpiresAt) <= this.now()) {
      throw new Error("Dataset export download token has expired");
    }
    if (Date.parse(record.expiresAt) <= this.now()) {
      await this.expireRecord(record);
      throw new Error("Dataset export has expired or is unavailable");
    }

    return { filename: record.filename, size: record.size ?? 0, storagePath: record.storagePath };
  }

  async streamArchive(
    archive: DatasetExportArchiveMetadata,
    onChunk: DatasetExportChunkReader,
  ): Promise<void> {
    if (!this.dependencies.storage.streamFile) {
      throw new Error("Dataset export chunk streaming is not configured");
    }
    await this.dependencies.storage.streamFile(archive.storagePath, onChunk);
  }

  async listExports(ownerId: string): Promise<DatasetExportHistoryItem[]> {
    const records = await this.dependencies.metadata.list(ownerId);
    const currentTime = this.now();
    const history: DatasetExportHistoryItem[] = [];

    for (const record of records) {
      if (record.status === "ready" && Date.parse(record.expiresAt) <= currentTime) {
        await this.expireRecord(record);
        history.push(mapRecord({ ...record, status: "expired" }));
      } else {
        history.push(mapRecord(record));
      }
    }

    return history.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  }

  async createSignedDownloadUrl(exportId: string, ownerId: string): Promise<DatasetExportDownload> {
    const record = await this.dependencies.metadata.find(ownerId, exportId);
    if (!record) throw new Error("Dataset export not found");
    if (record.status !== "ready" || !record.storagePath || !record.filename) {
      throw new Error("Dataset export has expired or is unavailable");
    }

    const remainingSeconds = Math.floor((Date.parse(record.expiresAt) - this.now()) / 1000);
    if (remainingSeconds <= 0) {
      await this.expireRecord(record);
      throw new Error("Dataset export has expired or is unavailable");
    }

    const url = await this.dependencies.storage.createSignedUrl(
      record.storagePath,
      Math.min(SIGNED_URL_MAX_AGE_SECONDS, remainingSeconds),
      record.filename,
    );
    await this.dependencies.metadata.incrementDownloadCount(exportId, toIso(this.now()));
    return { url, filename: record.filename };
  }

  private async expireRecord(record: DatasetExportMetadataRecord): Promise<void> {
    await this.dependencies.metadata.update(record.exportId, { status: "expired" });
    if (record.storagePath) {
      await this.dependencies.storage.removeFile(record.storagePath).catch(() => undefined);
    }
  }
}

export const developerDatasetExportStore = new DeveloperDatasetExportStore();
