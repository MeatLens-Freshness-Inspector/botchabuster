import assert from "node:assert/strict";
import test from "node:test";
import { resolveAppSessionConfig } from "../src/services/AppSessionService";

test("resolveAppSessionConfig requires APP_SESSION_SECRET and never falls back to the Supabase service key", () => {
  assert.throws(
    () =>
      resolveAppSessionConfig({
        SUPABASE_SERVICE_KEY: "supabase-service-secret",
      } as NodeJS.ProcessEnv),
    /APP_SESSION_SECRET/i,
  );
});

test("resolveAppSessionConfig applies the minimum TTL and uses only APP_SESSION_SECRET", () => {
  const config = resolveAppSessionConfig({
    APP_SESSION_SECRET: "app-session-secret",
    APP_SESSION_TTL_SECONDS: "120",
    SUPABASE_SERVICE_KEY: "supabase-service-secret",
  } as NodeJS.ProcessEnv);

  assert.deepEqual(config, {
    secret: "app-session-secret",
    ttlSeconds: 300,
  });
});
