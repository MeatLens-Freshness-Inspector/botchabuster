import { createClient } from "@supabase/supabase-js";
import { resolveSupabaseClientConfig } from "./supabaseConfig";

const { supabaseUrl, supabaseServiceKey, supabasePublishableKey } = resolveSupabaseClientConfig(process.env);

const authOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
};

export const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: authOptions });
export const supabaseAuth = createClient(supabaseUrl, supabasePublishableKey, { auth: authOptions });
