export { SupabaseAnalyticsRepository } from "./infrastructure/SupabaseAnalyticsRepository";
export { GetLandingPageStats } from "./application/GetLandingPageStats";
export { GetInspectionStatistics } from "./application/GetInspectionStatistics";
export type {
  GetInspectionStatisticsInput,
  InspectionStatistics,
} from "./application/GetInspectionStatistics";
export { LandingPageStatsController } from "./presentation/controllers/LandingPageStatsController";
export { createAnalyticsRouter, createDefaultAnalyticsRouter } from "./presentation/routes";
export { createSupabaseAnalyticsRepository } from "./infrastructure/SupabaseAnalyticsFactory";
export { AnalyticsView } from "./presentation/views/AnalyticsView";
export type {
  AnalyticsRepository,
  ClassificationStat,
  LandingPageStats,
} from "./domain/ports/AnalyticsRepository";
