import { supabase } from "../../../integrations/supabase";
import { PasskeyService } from "./PasskeyService";

export function createSupabasePasskeyService(): PasskeyService {
  return new PasskeyService(supabase);
}
