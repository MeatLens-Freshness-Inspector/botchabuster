import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type { LandingPageStats } from "../domain/ports/AnalyticsRepository";
import { LandingPageStatsController } from "./controllers/LandingPageStatsController";

export interface LandingPageStatsQuery {
  execute(): Promise<LandingPageStats>;
}

export function createAnalyticsRouter(query: LandingPageStatsQuery): Router {
  const router = Router();
  const controller = new LandingPageStatsController(query);

  router.get("/landing-page", (req: Request, res: Response, next: NextFunction) => {
    void controller.handle(req, res, next);
  });

  return router;
}
