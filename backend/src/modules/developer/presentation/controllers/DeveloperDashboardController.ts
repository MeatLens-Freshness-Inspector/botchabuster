import { rm } from "node:fs/promises";
import type { Request, Response } from "express";
import { materializeTransportFile, type MaterializedTransportFile } from "../../../../middleware/upload";
import { developerDashboardService } from "../../infrastructure/DeveloperDashboardService";
import type { DeveloperDatasetClassification, DeveloperDatasetFilters } from "../../../../types/developerDashboard";
import type { Inspection } from "../../../../types/inspection";
import { GetDeveloperOverview } from "../../application/GetDeveloperOverview";
import { ListDeveloperDatasets } from "../../application/ListDeveloperDatasets";
import { ExportDeveloperDataset } from "../../application/ExportDeveloperDataset";
import { UpdateDatasetClassification } from "../../application/UpdateDatasetClassification";
import { ListTrainingRuns } from "../../application/ListTrainingRuns";
import { ImportTrainingRun } from "../../application/ImportTrainingRun";

const ALLOWED_CLASSIFICATIONS = new Set<DeveloperDatasetClassification>([
  "fresh",
  "not fresh",
  "spoiled",
  "acceptable",
  "warning",
]);

const dashboard = developerDashboardService;
const getOverview = new GetDeveloperOverview(dashboard);
const listDatasets = new ListDeveloperDatasets(dashboard);
const exportDataset = new ExportDeveloperDataset(dashboard);
const updateClassification = new UpdateDatasetClassification(dashboard);
const listRuns = new ListTrainingRuns(dashboard);
const importRun = new ImportTrainingRun(dashboard);

function parseBoolean(value: unknown): boolean | undefined {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

function parsePositiveInteger(value: unknown, fallback: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), 1), max);
}

function parseOffset(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(Math.trunc(parsed), 0);
}

function parseString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function parseClassification(value: unknown): Inspection["classification"] | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return ALLOWED_CLASSIFICATIONS.has(normalized as DeveloperDatasetClassification)
    ? (normalized as Inspection["classification"])
    : undefined;
}

export class DeveloperDashboardController {
  private parseFilters(input: Record<string, unknown>): DeveloperDatasetFilters {
    return {
      limit: parsePositiveInteger(input.limit, 50, 10_000),
      offset: parseOffset(input.offset),
      meatType: parseString(input.meatType),
      classification: parseString(input.classification),
      inspector: parseString(input.inspector),
      location: parseString(input.location),
      hasImage: parseBoolean(input.hasImage),
      dateFrom: parseString(input.dateFrom),
      dateTo: parseString(input.dateTo),
    };
  }

  private handleError(action: string, res: Response, error: unknown, fallbackMessage: string): void {
    console.error(`${action} error:`, error);
    res.status(500).json({ error: error instanceof Error ? error.message : fallbackMessage });
  }

  async getOverview(_req: Request, res: Response): Promise<void> {
    try {
      res.json(await getOverview.execute());
    } catch (error) {
      this.handleError("Get developer overview", res, error, "Failed to fetch developer overview");
    }
  }

  async getDatasets(req: Request, res: Response): Promise<void> {
    try {
      res.json(await listDatasets.execute(this.parseFilters(req.query as Record<string, unknown>)));
    } catch (error) {
      this.handleError("Get developer datasets", res, error, "Failed to fetch developer datasets");
    }
  }

  async exportDatasets(req: Request, res: Response): Promise<void> {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const exported = await exportDataset.execute(this.parseFilters(body));
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${exported.filename}"`);
      res.status(200).send(exported.buffer);
    } catch (error) {
      this.handleError("Export developer datasets", res, error, "Failed to export developer datasets");
    }
  }

  async startDatasetExport(req: Request, res: Response): Promise<void> {
    try {
      const ownerId = req.auth?.userId;
      if (!ownerId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const body = (req.body ?? {}) as Record<string, unknown>;
      res.status(202).json(
        dashboard.startDatasetExportSession(this.parseFilters(body), ownerId),
      );
    } catch (error) {
      this.handleError("Start developer dataset export", res, error, "Failed to start developer dataset export");
    }
  }

  async getDatasetExportProgress(req: Request, res: Response): Promise<void> {
    try {
      const ownerId = req.auth?.userId;
      if (!ownerId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      res.json(dashboard.getDatasetExportProgress(req.params.exportId ?? "", ownerId));
    } catch (error) {
      this.handleError("Get developer dataset export progress", res, error, "Failed to get developer dataset export progress");
    }
  }

  async downloadDatasetExport(req: Request, res: Response): Promise<void> {
    try {
      const ownerId = req.auth?.userId;
      if (!ownerId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const exported = dashboard.getDatasetExportBuffer(req.params.exportId ?? "", ownerId);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${exported.filename}"`);
      res.status(200).send(exported.buffer);
    } catch (error) {
      this.handleError("Download developer dataset export", res, error, "Failed to download developer dataset export");
    }
  }

  async updateDatasetManualClassification(req: Request, res: Response): Promise<void> {
    try {
      const inspectionId = typeof req.params.inspectionId === "string" ? req.params.inspectionId.trim() : "";
      if (!inspectionId) {
        res.status(400).json({ error: "Inspection ID is required" });
        return;
      }

      const body = (req.body ?? {}) as Record<string, unknown>;
      const manualClassification = parseClassification(body.manualClassification);
      if (!manualClassification) {
        res.status(400).json({ error: "manualClassification is required" });
        return;
      }

      res.json(
        await updateClassification.execute(inspectionId, manualClassification),
      );
    } catch (error) {
      this.handleError("Update developer dataset classification", res, error, "Failed to update dataset classification");
    }
  }

  async listTrainingRuns(_req: Request, res: Response): Promise<void> {
    try {
      res.json(await listRuns.execute());
    } catch (error) {
      this.handleError("List developer training runs", res, error, "Failed to fetch training runs");
    }
  }

  async importTrainingRun(req: Request, res: Response): Promise<void> {
    let uploadedFile: MaterializedTransportFile | undefined;

    try {
      const transportFile = req.transportFiles?.package;
      if (!transportFile) {
        res.status(400).json({ error: "Training package ZIP is required" });
        return;
      }

      uploadedFile = await materializeTransportFile(transportFile, {
        maxBytes: 10 * 1024 * 1024,
        allowedMimeTypes: ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
      });
      const importedRun = await importRun.execute(uploadedFile.path);
      res.status(201).json(importedRun);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to import training run" });
    } finally {
      if (uploadedFile?.path) {
        await rm(uploadedFile.path, { force: true }).catch(() => undefined);
      }
    }
  }
}
