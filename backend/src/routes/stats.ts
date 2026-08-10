import { supabase } from "../integrations/supabase";
import {
  createAnalyticsRouter,
  GetLandingPageStats,
  SupabaseAnalyticsRepository,
} from "../modules/analytics";

const analyticsRepository = new SupabaseAnalyticsRepository(supabase);
const landingPageStatsQuery = new GetLandingPageStats(analyticsRepository);

export default createAnalyticsRouter(landingPageStatsQuery);
