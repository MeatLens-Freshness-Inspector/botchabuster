import type { NextFunction, Request, Response } from "express";
import type { LandingPageStats } from "../../domain/ports/AnalyticsRepository";
import { AnalyticsView } from "../views/AnalyticsView";

interface LandingPageStatsQuery {
  execute(): Promise<LandingPageStats>;
}

export class LandingPageStatsController {
  constructor(private readonly query: LandingPageStatsQuery) {}

  async handle(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await this.query.execute();
      res.json(AnalyticsView.landingPageStats(stats));
    } catch (error) {
      next(error);
    }
  }
}
