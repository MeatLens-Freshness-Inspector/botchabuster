import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseClientConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  supabasePublishableKey: string;
}

export interface SupabaseClients {
  service: SupabaseClient;
  publishable: SupabaseClient;
}

const authOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
};

export function createSupabaseClients(config: SupabaseClientConfig): SupabaseClients {
  return {
    service: createClient(config.supabaseUrl, config.supabaseServiceKey, { auth: authOptions }),
    publishable: createClient(config.supabaseUrl, config.supabasePublishableKey, { auth: authOptions }),
  };
}
