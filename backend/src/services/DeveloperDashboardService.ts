import { promises as fs } from "node:fs";
import path from "node:path";
import { strToU8, unzipSync, zipSync } from "fflate";
import { inspectionService } from "./InspectionService";
import { developerDashboardStorageService } from "./DeveloperDashboardStorageService";
import type { Inspection } from "../types/inspection";
import type {
  DatasetExportManifest,
  DeveloperDatasetFilters,
  DeveloperDatasetListResponse,
  DeveloperOverviewMetricPoint,
  DeveloperOverviewResponse,
  TrainingRunManifest,
  TrainingRunRecord,
} from "../types/developerDashboard";

const MAX_EXPORT_ROWS = 10_000;
const IMAGE_DOWNLOAD_CONCURRENCY = 6;

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

  private constructor() {}

  static getInstance(): DeveloperDashboardService {
    if (!DeveloperDashboardService.instance) {
      DeveloperDashboardService.instance = new DeveloperDashboardService();
    }
    return DeveloperDashboardService.instance;
  }

  async getOverview(): Promise<DeveloperOverviewResponse> {
    const runs = await this.listTrainingRuns();
    const points = runs.map(metricPointFromRun);

    return {
      highlightedFamilies: {
        mobilenetv2: points.find((point) => normalizeFamily(point.modelFamily).includes("mobilenetv2")) ?? null,
        mobilenetv3: points.find((point) => normalizeFamily(point.modelFamily).includes("mobilenetv3")) ?? null,
      },
      latestRuns: points.slice(0, 10),
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

  async exportDatasetZip(filters: DeveloperDatasetFilters): Promise<{ filename: string; buffer: Buffer }> {
    const dataset = await this.listDatasets({
      ...filters,
      limit: MAX_EXPORT_ROWS,
      offset: 0,
    });
    const files: Record<string, Uint8Array> = {
      "inspections.csv": strToU8(this.buildInspectionCsv(dataset.items)),
    };
    const rowsMissingImages: string[] = [];
    let imageCount = 0;

    const downloadedImages = await this.downloadInspectionImages(dataset.items);

    for (let index = 0; index < dataset.items.length; index += 1) {
      const inspection = dataset.items[index];
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
      totalRecordCount: dataset.total,
      exportedRecordCount: dataset.items.length,
      imageCount,
      rowsMissingImages,
    };
    files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));

    return {
      filename: `developer-dataset-${Date.now()}.zip`,
      buffer: Buffer.from(zipSync(files)),
    };
  }

  private async downloadInspectionImages(inspections: Inspection[]): Promise<Array<DownloadedExportImage | null>> {
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
      }
    });

    await Promise.all(workers);
    return results;
  }

  private async downloadInspectionImage(inspection: Inspection): Promise<DownloadedExportImage | null> {
    if (!inspection.image_url) {
      return null;
    }

    try {
      const imageResponse = await fetch(inspection.image_url);
      if (!imageResponse.ok) {
        return null;
      }

      return {
        id: inspection.id,
        extension: this.resolveImageExtension(inspection.image_url, imageResponse.headers.get("content-type")),
        bytes: new Uint8Array(await imageResponse.arrayBuffer()),
      };
    } catch {
      return null;
    }
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

  private buildInspectionCsv(inspections: Inspection[]): string {
    const headers = [
      "date",
      "meat",
      "manual classification",
      "confidence",
    ] as const;
    const rows = inspections.map((inspection) => {
      const manualClassification = inspection.manual_classification ?? inspection.classification;
      return [
        inspection.captured_at.slice(0, 10),
        inspection.meat_type,
        manualClassification,
        inspection.confidence_score,
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
