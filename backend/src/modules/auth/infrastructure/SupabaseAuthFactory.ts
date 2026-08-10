import { supabase, supabaseAuth } from "../../../integrations/supabase";
import { SupabaseAuthOperations } from "./SupabaseAuthOperations";

export function createSupabaseAuthOperations(): SupabaseAuthOperations {
  return new SupabaseAuthOperations(supabaseAuth.auth, {}, supabase);
}

export const authOperations = createSupabaseAuthOperations();
export const authService = authOperations;
