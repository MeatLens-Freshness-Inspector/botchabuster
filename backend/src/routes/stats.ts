import {
  createAnalyticsRouter,
  GetLandingPageStats,
  createSupabaseAnalyticsRepository,
} from "../modules/analytics";

const analyticsRepository = createSupabaseAnalyticsRepository();
const landingPageStatsQuery = new GetLandingPageStats(analyticsRepository);

export default createAnalyticsRouter(landingPageStatsQuery);
