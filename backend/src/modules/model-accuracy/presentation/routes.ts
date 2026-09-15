import { Router } from "express";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type {
  ModelAccuracyHistoryQuery,
  ModelAccuracySnapshot,
  ModelVersion,
  RegisterModelVersionInput,
} from "../domain/modelAccuracy";
import { CaptureModelAccuracySnapshots } from "../application/CaptureModelAccuracySnapshots";
import { GetModelAccuracyHistory } from "../application/GetModelAccuracyHistory";
import { RegisterModelVersion } from "../application/RegisterModelVersion";
import type { CalibrationAnalyticsQuery, CalibrationAnalyticsResponse, CalibrationImportRecord } from "../domain/modelCalibration";
import type { RequestAuthContext } from "../../../middleware/auth";
import { GetModelCalibrationAnalytics } from "../application/GetModelCalibrationAnalytics";
import { ImportModelCalibration } from "../application/ImportModelCalibration";
import { materializeTransportFile } from "../../../middleware/upload";
import { rm } from "node:fs/promises";

export interface ModelAccuracyRouteHandlers {
  register(input: RegisterModelVersionInput): Promise<ModelVersion>;
  history(input: ModelAccuracyHistoryQuery): Promise<ModelAccuracySnapshot[]>;
  capture(input: { snapshotDate?: string }): Promise<ModelAccuracySnapshot[]>;
  analytics(input: CalibrationAnalyticsQuery): Promise<CalibrationAnalyticsResponse>;
  importCalibration(input: { packagePath: string; importedBy: string }): Promise<CalibrationImportRecord>;
  auditImport?(payload: Record<string, unknown>): Promise<void>;
}

export function buildCalibrationImportAuditPayload(
  actor: Pick<RequestAuthContext, "userId" | "primaryRole">,
  imported: CalibrationImportRecord,
): Record<string, unknown> {
  return {
    event_type: "model.calibration.imported",
    event_time: new Date().toISOString(),
    actor: { id: actor.userId, role: actor.primaryRole },
    data: {
      import_id: imported.id,
      source_hash: imported.sourceHash,
      model_version_key: imported.modelVersionKey,
      sample_count: imported.sampleCount,
    },
  };
}

function readQueryDate(value: unknown, name: string): string {
  if (typeof value !== "string" || !value) {
    const error = new Error(`${name} is required`) as Error & { statusCode: number };
    error.statusCode = 400;
    throw error;
  }
  return value;
}

const requireAuthenticated: RequestHandler = (req, res, next) => {
  const { requireAuthentication } = require("../../../middleware/auth") as typeof import("../../../middleware/auth");
  return requireAuthentication(req, res, next);
};

const requireDeveloperAccess: RequestHandler = (req, res, next) => {
  const { requireDeveloper } = require("../../../middleware/auth") as typeof import("../../../middleware/auth");
  return requireDeveloper(req, res, next);
};

const requireDeveloperOrAdminAccess: RequestHandler = (req, res, next) => {
  const { requireDeveloperOrAdmin } = require("../../../middleware/auth") as typeof import("../../../middleware/auth");
  return requireDeveloperOrAdmin(req, res, next);
};

function readOptionalQuery(value: unknown, name: string): string | null {
  if (value === undefined || value === "") return null;
  if (typeof value !== "string") {
    const error = new Error(`${name} must be a string`) as Error & { statusCode: number };
    error.statusCode = 400;
    throw error;
  }
  return value.trim() || null;
}

function requestUserId(req: Request): string {
  const { getRequestAuthContext } = require("../../../middleware/auth") as typeof import("../../../middleware/auth");
  return getRequestAuthContext(req).userId;
}

export function createModelAccuracyRouter(handlers: ModelAccuracyRouteHandlers): Router {
  const router = Router();

  router.get("/history", requireAuthenticated, (req: Request, res: Response, next: NextFunction) => {
    void handlers
      .history({
        startDate: readQueryDate(req.query.startDate, "startDate"),
        endDate: readQueryDate(req.query.endDate, "endDate"),
      })
      .then((history) => res.json(history))
      .catch(next);
  });

  router.post("/versions", requireDeveloperAccess, (req: Request, res: Response, next: NextFunction) => {
    void handlers
      .register({ ...(req.body as Omit<RegisterModelVersionInput, "createdBy">), createdBy: requestUserId(req) })
      .then((version) => res.status(201).json(version))
      .catch(next);
  });

  router.post("/snapshots", requireDeveloperAccess, (req: Request, res: Response, next: NextFunction) => {
    void handlers
      .capture({ snapshotDate: (req.body as { snapshotDate?: unknown } | undefined)?.snapshotDate as string | undefined })
      .then((snapshots) => res.status(201).json(snapshots))
      .catch(next);
  });

  router.get("/calibration", requireDeveloperOrAdminAccess, (req: Request, res: Response, next: NextFunction) => {
    void handlers
      .analytics({
        modelVersionKey: readOptionalQuery(req.query.modelVersionKey, "modelVersionKey"),
        className: readOptionalQuery(req.query.className, "className"),
      })
      .then((analytics) => res.json(analytics))
      .catch(next);
  });

  router.post("/calibration/import", requireDeveloperOrAdminAccess, (req: Request, res: Response, next: NextFunction) => {
    let uploadedFile: { path: string } | undefined;
    void (async () => {
      try {
        const transportFile = req.transportFiles?.package;
        if (!transportFile) {
          res.status(400).json({ error: "Calibration package ZIP is required" });
          return;
        }
        uploadedFile = await materializeTransportFile(transportFile, {
          maxBytes: 50 * 1024 * 1024,
          allowedMimeTypes: ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
        });
        const result = await handlers.importCalibration({ packagePath: uploadedFile.path, importedBy: requestUserId(req) });
        if (handlers.auditImport) {
          const { getRequestAuthContext } = require("../../../middleware/auth") as typeof import("../../../middleware/auth");
          await handlers.auditImport(buildCalibrationImportAuditPayload(getRequestAuthContext(req), result));
        }
        res.status(201).json(result);
      } catch (error) {
        const validationError = error instanceof Error ? error : new Error("Failed to import calibration package");
        (validationError as Error & { statusCode?: number }).statusCode = 400;
        next(validationError);
      } finally {
        if (uploadedFile?.path) await rm(uploadedFile.path, { force: true }).catch(() => undefined);
      }
    })();
  });

  return router;
}

export function createDefaultModelAccuracyRouter(): Router {
  const { createSupabaseModelAccuracyRepository } = require("../infrastructure/SupabaseModelAccuracyFactory") as typeof import("../infrastructure/SupabaseModelAccuracyFactory");
  const repository = createSupabaseModelAccuracyRepository();
  const register = new RegisterModelVersion(repository);
  const history = new GetModelAccuracyHistory(repository);
  const capture = new CaptureModelAccuracySnapshots(repository);
  const analytics = new GetModelCalibrationAnalytics(repository);
  const importCalibration = new ImportModelCalibration(repository);
  const auditImport = async (payload: Record<string, unknown>): Promise<void> => {
    const { auditLogService } = require("../../audit/infrastructure/AuditLogService") as typeof import("../../audit/infrastructure/AuditLogService");
    await auditLogService.write({ payload });
  };

  return createModelAccuracyRouter({
    register: (input) => register.execute(input),
    history: (input) => history.execute(input),
    capture: (input) => capture.execute(input),
    analytics: (input) => analytics.execute(input),
    importCalibration: (input) => importCalibration.execute(input),
    auditImport,
  });
}
