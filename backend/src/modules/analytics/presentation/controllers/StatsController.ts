import { Request, Response } from "express";
import { statsService } from "../../../../services/StatsService";

export class StatsController {
  async getLandingPageStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await statsService.getLandingPageStats();
      res.json(stats);
    } catch (error) {
      console.error("Get landing page stats error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch stats" });
    }
  }
}
