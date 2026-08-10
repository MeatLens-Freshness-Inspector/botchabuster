import { Request, Response } from "express";
import { GetLandingPageStats } from "../../application/GetLandingPageStats";
import { createSupabaseAnalyticsRepository } from "../../infrastructure/SupabaseAnalyticsFactory";

const statsQuery = new GetLandingPageStats(createSupabaseAnalyticsRepository());

export class StatsController {
  async getLandingPageStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await statsQuery.execute();
      res.json(stats);
    } catch (error) {
      console.error("Get landing page stats error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch stats" });
    }
  }
}
