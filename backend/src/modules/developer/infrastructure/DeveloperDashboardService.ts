import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { strToU8, unzipSync, zipSync } from "fflate";
import { inspectionService } from "../../inspections/infrastructure/InspectionService";
import { developerDashboardStorageService } from "./DeveloperDashboardStorageService";
import type { Inspection } from "../../../types/inspection";
import type {
  DatasetExportManifest,
  DeveloperDatasetFilters,
  DeveloperDatasetListResponse,
  DeveloperOverviewMetricPoint,
  DeveloperOverviewResponse,
  TrainingRunManifest,
  TrainingRunRecord,
} from "../../../types/developerDashboard";

const MAX_EXPORT_ROWS = 10_000;
const IMAGE_DOWNLOAD_CONCURRENCY = 12;
const IMAGE_DOWNLOAD_TIMEOUT_MS = 15_000;
const IMAGE_DOWNLOAD_RETRIES = 2;
const MAX_DATASET_EXPORT_SESSIONS = 20;
const DATASET_EXPORT_SESSION_TTL_MS = 10 * 60 * 1000;

export interface DatasetExportProgress {
  status: "running" | "completed" | "failed";
  stage: string;
  current: number;
  total: number;
  error?: string;
}

export interface DatasetExportProgressUpdate {
  stage: string;
  current: number;
  total: number;
}

type DatasetExportSession = {
  ownerId: string;
  createdAt: number;
  progress: DatasetExportProgress;
  result: { filename: string; buffer: Buffer } | null;
};

interface DownloadedExportImage {
  id: string;
  extension: "jpg" | "png" | "webp";
  bytes: Uint8Array;
}

function normalizeFamily(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isFiniteUnitMetric(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isSafeRelativePath(value: string): boolean {
  const normalized = value.replace(/\\/g, "/");
  return (
    normalized.trim().length > 0 &&
    !path.isAbsolute(normalized) &&
    !normalized.split("/").some((segment) => segment === ".." || segment.trim().length === 0)
  );
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = Array.isArray(value) || typeof value === "object"
    ? JSON.stringify(value)
    : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function metricPointFromRun(run: TrainingRunRecord): DeveloperOverviewMetricPoint {
  return {
    runId: run.runId,
    createdAt: run.createdAt,
    modelFamily: run.modelFamily,
    modelVariant: run.modelVariant,
    modelVersion: run.modelVersion,
    datasetName: run.datasetName,
    datasetRecordCount: run.datasetRecordCount,
    accuracy: run.metrics.accuracy,
    precision: run.metrics.precision,
    recall: run.metrics.recall,
    f1Score: run.metrics.f1Score,
  };
}

export class DeveloperDashboardService {
  private static instance: DeveloperDashboardService;
  private readonly datasetExportSessions = new Map<string, DatasetExportSession>();

  private constructor() {}

  static getInstance(): DeveloperDashboardService {
    if (!DeveloperDashboardService.instance) {
      DeveloperDashboardService.instance = new DeveloperDashboardService();
    }
    return DeveloperDashboardService.instance;
  }

  async getOverview(): Promise<DeveloperOverviewResponse> {
    const [runs, inAppMetrics] = await Promise.all([
      this.listTrainingRuns(),
      inspectionService.getInAppModelMetrics(),
    ]);
    const points = runs.map(metricPointFromRun);

    return {
      highlightedFamilies: {
        mobilenetv2: points.find((point) => normalizeFamily(point.modelFamily).includes("mobilenetv2")) ?? null,
        mobilenetv3: points.find((point) => normalizeFamily(point.modelFamily).includes("mobilenetv3")) ?? null,
      },
      latestRuns: points.slice(0, 10),
      inAppMetrics,
    };
  }

  async listDatasets(filters: DeveloperDatasetFilters): Promise<DeveloperDatasetListResponse> {
    return inspectionService.getDeveloperDatasetPage(filters);
  }

  async updateDatasetManualClassification(
    inspectionId: string,
    manualClassification: Inspection["classification"],
  ): Promise<Inspection> {
    return inspectionService.updateManualClassification(inspectionId, manualClassification);
  }

  startDatasetExportSession(filters: DeveloperDatasetFilters, ownerId: string): { exportId: string } {
    this.pruneDatasetExportSessions();
    while (this.datasetExportSessions.size >= MAX_DATASET_EXPORT_SESSIONS) {
      const oldestId = this.datasetExportSessions.keys().next().value as string | undefined;
      if (!oldestId) break;
      this.datasetExportSessions.delete(oldestId);
    }

    const exportId = randomUUID();
    const session: DatasetExportSession = {
      ownerId,
      createdAt: Date.now(),
      progress: {
        status: "running",
        stage: "querying",
        current: 0,
        total: 1,
      },
      result: null,
    };
    this.datasetExportSessions.set(exportId, session);

    void this.exportDatasetZip(filters, (update) => {
      session.progress = {
        ...session.progress,
        ...update,
        status: "running",
      };
    }).then((result) => {
      session.result = result;
      session.progress = {
        status: "completed",
        stage: "complete",
        current: 1,
        total: 1,
      };
    }).catch((error: unknown) => {
      session.progress = {
        status: "failed",
        stage: "failed",
        current: 0,
        total: 1,
        error: error instanceof Error ? error.message : "Failed to export developer datasets",
      };
    });

    return { exportId };
  }

  getDatasetExportProgress(exportId: string, ownerId: string): DatasetExportProgress {
    return { ...this.getDatasetExportSession(exportId, ownerId).progress };
  }

  getDatasetExportBuffer(exportId: string, ownerId: string): { filename: string; buffer: Buffer } {
    const session = this.getDatasetExportSession(exportId, ownerId);
    if (session.progress.status === "running") {
      throw new Error("Dataset export is still running");
    }
    if (session.progress.status === "failed" || !session.result) {
      throw new Error(session.progress.error ?? "Failed to export developer datasets");
    }

    this.datasetExportSessions.delete(exportId);
    return session.result;
  }

  private pruneDatasetExportSessions(): void {
    const cutoff = Date.now() - DATASET_EXPORT_SESSION_TTL_MS;
    for (const [exportId, session] of this.datasetExportSessions) {
      if (session.createdAt < cutoff) {
        this.datasetExportSessions.delete(exportId);
      }
    }
  }

  private getDatasetExportSession(exportId: string, ownerId: string): DatasetExportSession {
    this.pruneDatasetExportSessions();
    const session = this.datasetExportSessions.get(exportId);
    if (!session) throw new Error("Dataset export session not found");
    if (session.ownerId !== ownerId) throw new Error("Dataset export session not authorized");
    return session;
  }

  async exportDatasetZip(
    filters: DeveloperDatasetFilters,
    onProgress?: (update: DatasetExportProgressUpdate) => void,
  ): Promise<{ filename: string; buffer: Buffer }> {
    onProgress?.({ stage: "querying", current: 0, total: 1 });
    const datasetItems = await inspectionService.getDeveloperDatasetExportRows({
      ...filters,
      limit: MAX_EXPORT_ROWS,
      offset: 0,
    });
    const imageTotal = Math.max(1, datasetItems.length);
    onProgress?.({ stage: "downloading-images", current: 0, total: imageTotal });
    const downloadedImages = await this.downloadInspectionImages(datasetItems, (current) => {
      onProgress?.({ stage: "downloading-images", current, total: imageTotal });
    });
    const failedImageIds = datasetItems
      .filter((inspection, index) => Boolean(inspection.image_url) && !downloadedImages[index])
      .map((inspection) => inspection.id);

    if (failedImageIds.length > 0) {
      throw new Error(`Failed to download required inspection images: ${failedImageIds.join(", ")}`);
    }

    onProgress?.({ stage: "assembling-zip", current: 0, total: 1 });
    const files: Record<string, Uint8Array> = {
      "inspections.csv": strToU8(this.buildInspectionCsv(datasetItems, downloadedImages)),
    };
    const rowsMissingImages: string[] = [];
    let imageCount = 0;

    for (let index = 0; index < datasetItems.length; index += 1) {
      const inspection = datasetItems[index];
      const downloadedImage = downloadedImages[index];

      if (!downloadedImage) {
        rowsMissingImages.push(inspection.id);
        continue;
      }

      files[`images/${downloadedImage.id}.${downloadedImage.extension}`] = downloadedImage.bytes;
      imageCount += 1;
    }

    const manifest: DatasetExportManifest = {
      exportedAt: new Date().toISOString(),
      filters,
      totalRecordCount: datasetItems.length,
      exportedRecordCount: datasetItems.length,
      imageCount,
      rowsMissingImages,
    };
    files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));

    const result = {
      filename: `developer-dataset-${Date.now()}.zip`,
      buffer: Buffer.from(zipSync(files, { level: 0 })),
    };
    onProgress?.({ stage: "complete", current: 1, total: 1 });
    return result;
  }

  private async downloadInspectionImages(
    inspections: Inspection[],
    onProgress?: (current: number) => void,
  ): Promise<Array<DownloadedExportImage | null>> {
    const results: Array<DownloadedExportImage | null> = Array.from({ length: inspections.length }, () => null);
    const workerCount = Math.min(IMAGE_DOWNLOAD_CONCURRENCY, inspections.length);
    let nextIndex = 0;

    const workers = Array.from({ length: workerCount }, async () => {
      while (true) {
        const currentIndex = nextIndex;
        nextIndex += 1;

        if (currentIndex >= inspections.length) {
          return;
        }

        results[currentIndex] = await this.downloadInspectionImage(inspections[currentIndex]);
        onProgress?.(currentIndex + 1);
      }
    });

    await Promise.all(workers);
    return results;
  }

  private async downloadInspectionImage(inspection: Inspection): Promise<DownloadedExportImage | null> {
    if (!inspection.image_url) {
      return null;
    }

    for (let attempt = 0; attempt <= IMAGE_DOWNLOAD_RETRIES; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), IMAGE_DOWNLOAD_TIMEOUT_MS);

      try {
        const imageResponse = await fetch(inspection.image_url, { signal: controller.signal });
        if (!imageResponse.ok) {
          continue;
        }

        return {
          id: inspection.id,
          extension: this.resolveImageExtension(inspection.image_url, imageResponse.headers.get("content-type")),
          bytes: new Uint8Array(await imageResponse.arrayBuffer()),
        };
      } catch {
        if (attempt === IMAGE_DOWNLOAD_RETRIES) {
          return null;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    return null;
  }

  async listTrainingRuns(): Promise<TrainingRunRecord[]> {
    const runIds = await developerDashboardStorageService.listTrainingRunIds();
    const runs: TrainingRunRecord[] = [];

    for (const runId of runIds) {
      try {
        const manifestPath = developerDashboardStorageService.buildManifestPath(runId);
        const manifest = JSON.parse(await developerDashboardStorageService.downloadText(manifestPath)) as TrainingRunManifest;
        this.assertManifest(manifest);
        runs.push({
          ...manifest,
          manifestPath,
          artifactPaths: (manifest.artifactDescriptors ?? []).map((artifact) =>
            developerDashboardStorageService.buildArtifactPath(manifest.runId, artifact.path),
          ),
        });
      } catch (error) {
        console.error("Failed to load developer training run manifest:", error);
      }
    }

    return runs.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  }

  async importTrainingRunPackage(filePath: string): Promise<TrainingRunRecord> {
    const zip = unzipSync(new Uint8Array(await fs.readFile(filePath)));
    const manifestEntry = zip["manifest.json"];
    if (!manifestEntry) {
      throw new Error("Training package must include manifest.json");
    }

    const manifest = JSON.parse(Buffer.from(manifestEntry).toString("utf-8")) as TrainingRunManifest;
    this.assertManifest(manifest);

    const artifactPaths: string[] = [];
    for (const artifact of manifest.artifactDescriptors ?? []) {
      if (!isSafeRelativePath(artifact.path)) {
        throw new Error(`Invalid artifact path: ${artifact.path}`);
      }

      const artifactEntry = zip[artifact.path];
      if (!artifactEntry) {
        throw new Error(`Training package is missing artifact: ${artifact.path}`);
      }

      const storagePath = developerDashboardStorageService.buildArtifactPath(manifest.runId, artifact.path);
      await developerDashboardStorageService.uploadBuffer(storagePath, artifactEntry, "application/octet-stream");
      artifactPaths.push(storagePath);
    }

    const manifestPath = developerDashboardStorageService.buildManifestPath(manifest.runId);
    await developerDashboardStorageService.uploadBuffer(manifestPath, manifestEntry, "application/json");

    return {
      ...manifest,
      manifestPath,
      artifactPaths,
    };
  }

  private assertManifest(manifest: TrainingRunManifest): void {
    if (!manifest || typeof manifest !== "object") {
      throw new Error("Training package manifest.json is invalid");
    }

    for (const [field, value] of Object.entries({
      runId: manifest.runId,
      createdAt: manifest.createdAt,
      modelFamily: manifest.modelFamily,
      modelVariant: manifest.modelVariant,
      modelVersion: manifest.modelVersion,
      datasetName: manifest.datasetName,
    })) {
      if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`Training package manifest.json field ${field} is required`);
      }
    }

    if (Number.isNaN(Date.parse(manifest.createdAt))) {
      throw new Error("Training package manifest.json field createdAt must be an ISO datetime");
    }

    if (!Number.isInteger(manifest.datasetRecordCount) || manifest.datasetRecordCount < 0) {
      throw new Error("Training package manifest.json field datasetRecordCount must be a non-negative integer");
    }

    if (
      !manifest.metrics ||
      !isFiniteUnitMetric(manifest.metrics.accuracy) ||
      !isFiniteUnitMetric(manifest.metrics.precision) ||
      !isFiniteUnitMetric(manifest.metrics.recall) ||
      !isFiniteUnitMetric(manifest.metrics.f1Score)
    ) {
      throw new Error("Training package manifest.json metrics must include accuracy, precision, recall, and f1Score from 0 to 1");
    }
  }

  private buildInspectionCsv(inspections: Inspection[], downloadedImages: Array<DownloadedExportImage | null>): string {
    const headers = [
      "date",
      "meat",
      "manual classification",
      "confidence",
      "image file",
    ] as const;
    const rows = inspections.map((inspection, index) => {
      const manualClassification = (inspection.manual_classification && inspection.manual_classification.trim()) || inspection.classification;
      const downloadedImage = downloadedImages[index] ?? null;
      const imageFile = downloadedImage ? `${downloadedImage.id}.${downloadedImage.extension}` : "";
      return [
        inspection.captured_at.slice(0, 10),
        inspection.meat_type,
        manualClassification,
        inspection.confidence_score,
        imageFile,
      ].map(csvEscape).join(",");
    });
    return [
      headers.join(","),
      ...rows,
    ].join("\n");
  }

  private resolveImageExtension(imageUrl: string, contentType: string | null): "jpg" | "png" | "webp" {
    if (contentType?.includes("png")) return "png";
    if (contentType?.includes("webp")) return "webp";

    const urlWithoutQuery = imageUrl.split("?")[0]?.toLowerCase() ?? "";
    if (urlWithoutQuery.endsWith(".png")) return "png";
    if (urlWithoutQuery.endsWith(".webp")) return "webp";
    return "jpg";
  }
}

export const developerDashboardService = DeveloperDashboardService.getInstance();
