import { supabase } from "../../../integrations/supabase";
import { SupabaseChatContactRepository } from "./SupabaseChatContactRepository";

export function createSupabaseChatContactRepository(): SupabaseChatContactRepository {
  return new SupabaseChatContactRepository(supabase);
}
