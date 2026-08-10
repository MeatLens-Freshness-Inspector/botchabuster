import type { LandingPageStats } from "../../domain/ports/AnalyticsRepository";

/** @final */
export class AnalyticsView {
  private constructor() {}

  static landingPageStats(stats: LandingPageStats): LandingPageStats {
    return {
      inspectionCount: stats.inspectionCount,
      userCount: stats.userCount,
      freshRate: stats.freshRate,
    };
  }
}
