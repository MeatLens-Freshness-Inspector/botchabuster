import { rm } from "node:fs/promises";
import type { Request, Response } from "express";
import { developerDashboardService } from "../services/DeveloperDashboardService";
import type { DeveloperDatasetFilters } from "../types/developerDashboard";

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
      res.json(await developerDashboardService.getOverview());
    } catch (error) {
      this.handleError("Get developer overview", res, error, "Failed to fetch developer overview");
    }
  }

  async getDatasets(req: Request, res: Response): Promise<void> {
    try {
      res.json(await developerDashboardService.listDatasets(this.parseFilters(req.query as Record<string, unknown>)));
    } catch (error) {
      this.handleError("Get developer datasets", res, error, "Failed to fetch developer datasets");
    }
  }

  async exportDatasets(req: Request, res: Response): Promise<void> {
    try {
      const exported = await developerDashboardService.exportDatasetZip(
        this.parseFilters((req.body ?? {}) as Record<string, unknown>),
      );
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${exported.filename}"`);
      res.status(200).send(exported.buffer);
    } catch (error) {
      this.handleError("Export developer datasets", res, error, "Failed to export developer datasets");
    }
  }

  async listTrainingRuns(_req: Request, res: Response): Promise<void> {
    try {
      res.json(await developerDashboardService.listTrainingRuns());
    } catch (error) {
      this.handleError("List developer training runs", res, error, "Failed to fetch training runs");
    }
  }

  async importTrainingRun(req: Request, res: Response): Promise<void> {
    const uploadedFile = req.file;

    try {
      if (!uploadedFile) {
        res.status(400).json({ error: "Training package ZIP is required" });
        return;
      }

      const importedRun = await developerDashboardService.importTrainingRunPackage(uploadedFile.path);
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
