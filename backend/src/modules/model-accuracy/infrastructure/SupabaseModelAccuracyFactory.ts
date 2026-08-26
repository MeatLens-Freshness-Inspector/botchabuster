import { supabase } from "../../../integrations/supabase";
import { SupabaseModelAccuracyRepository } from "./SupabaseModelAccuracyRepository";

export function createSupabaseModelAccuracyRepository(): SupabaseModelAccuracyRepository {
  return new SupabaseModelAccuracyRepository(supabase as never);
}
