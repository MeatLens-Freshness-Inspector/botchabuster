export interface SupabaseClientConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  supabasePublishableKey: string;
}

export function resolveSupabaseClientConfig(env: NodeJS.ProcessEnv): SupabaseClientConfig {
  const supabaseUrl = env.SUPABASE_URL?.trim() || "";
  const supabaseServiceKey = env.SUPABASE_SERVICE_KEY?.trim() || env.SUPABASE_KEY?.trim() || "";
  const supabasePublishableKey = env.SUPABASE_PUBLISHABLE_KEY?.trim() || env.SUPABASE_ANON_KEY?.trim() || "";

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing SUPABASE_URL and service key environment variables");
  }

  if (!supabasePublishableKey) {
    throw new Error("Missing SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY environment variable");
  }

  return {
    supabaseUrl,
    supabaseServiceKey,
    supabasePublishableKey,
  };
}
