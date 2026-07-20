import assert from "node:assert/strict";
import test from "node:test";
import { resolveSupabaseClientConfig } from "../../src/integrations/supabaseConfig";

test("resolveSupabaseClientConfig requires a publishable auth key and never falls back to the service key", () => {
  assert.throws(
    () =>
      resolveSupabaseClientConfig({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_KEY: "service-role-secret",
      } as NodeJS.ProcessEnv),
    /SUPABASE_PUBLISHABLE_KEY|SUPABASE_ANON_KEY/i,
  );
});

test("resolveSupabaseClientConfig keeps the service key and publishable key on separate trust boundaries", () => {
  const config = resolveSupabaseClientConfig({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_KEY: "service-role-secret",
    SUPABASE_ANON_KEY: "publishable-anon-key",
  } as NodeJS.ProcessEnv);

  assert.deepEqual(config, {
    supabaseUrl: "https://example.supabase.co",
    supabaseServiceKey: "service-role-secret",
    supabasePublishableKey: "publishable-anon-key",
  });
});
