import { GetLandingPageStats, createSupabaseAnalyticsRepository } from "../modules/analytics";

export interface LandingPageStats {
  inspectionCount: number;
  userCount: number;
  freshRate: number;
}

/** @deprecated Compatibility facade. Analytics queries live in the analytics module. */
export class StatsService {
  private static instance: StatsService;
  private readonly query = new GetLandingPageStats(createSupabaseAnalyticsRepository());

  private constructor() {}

  static getInstance(): StatsService {
    if (!StatsService.instance) StatsService.instance = new StatsService();
    return StatsService.instance;
  }

  getLandingPageStats(): Promise<LandingPageStats> {
    return this.query.execute();
  }
}

export const statsService = StatsService.getInstance();
