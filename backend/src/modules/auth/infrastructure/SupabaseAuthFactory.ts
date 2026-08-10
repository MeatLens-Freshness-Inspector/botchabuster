import { supabase, supabaseAuth } from "../../../integrations/supabase";
import { SupabaseAuthOperations } from "./SupabaseAuthOperations";

export function createSupabaseAuthOperations(): SupabaseAuthOperations {
  return new SupabaseAuthOperations(supabaseAuth.auth, {}, supabase);
}
