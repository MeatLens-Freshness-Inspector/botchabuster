import { supabase } from "../../../integrations/supabase";
import { SupabaseAnalyticsRepository } from "./SupabaseAnalyticsRepository";

export function createSupabaseAnalyticsRepository(): SupabaseAnalyticsRepository {
  return new SupabaseAnalyticsRepository(supabase);
}
