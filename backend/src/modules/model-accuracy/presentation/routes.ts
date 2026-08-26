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

export interface ModelAccuracyRouteHandlers {
  register(input: RegisterModelVersionInput): Promise<ModelVersion>;
  history(input: ModelAccuracyHistoryQuery): Promise<ModelAccuracySnapshot[]>;
  capture(input: { snapshotDate?: string }): Promise<ModelAccuracySnapshot[]>;
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

  return router;
}

export function createDefaultModelAccuracyRouter(): Router {
  const { createSupabaseModelAccuracyRepository } = require("../infrastructure/SupabaseModelAccuracyFactory") as typeof import("../infrastructure/SupabaseModelAccuracyFactory");
  const repository = createSupabaseModelAccuracyRepository();
  const register = new RegisterModelVersion(repository);
  const history = new GetModelAccuracyHistory(repository);
  const capture = new CaptureModelAccuracySnapshots(repository);

  return createModelAccuracyRouter({
    register: (input) => register.execute(input),
    history: (input) => history.execute(input),
    capture: (input) => capture.execute(input),
  });
}
