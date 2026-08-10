import assert from "node:assert/strict";
import { test } from "node:test";
import { parseEnvironment } from "../../../src/config/env";

const validEnvironment = {
  PORT: "3002",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_KEY: "service-key",
  SUPABASE_PUBLISHABLE_KEY: "publishable-key",
  APP_SESSION_SECRET: "session-secret",
};

test("parseEnvironment separates trusted and publishable Supabase credentials", () => {
  const config = parseEnvironment(validEnvironment);

  assert.equal(config.port, 3002);
  assert.equal(config.supabaseServiceKey, "service-key");
  assert.equal(config.supabasePublishableKey, "publishable-key");
  assert.deepEqual(config.allowedOrigins, []);
});

test("parseEnvironment rejects missing required credentials", () => {
  const missingSecret = { ...validEnvironment };
  delete missingSecret.APP_SESSION_SECRET;

  assert.throws(() => parseEnvironment(missingSecret), /APP_SESSION_SECRET/i);
});

test("parseEnvironment trims and parses allowed origins", () => {
  const config = parseEnvironment({
    ...validEnvironment,
    ALLOWED_ORIGINS: " https://one.example,https://two.example ",
  });

  assert.deepEqual(config.allowedOrigins, ["https://one.example", "https://two.example"]);
});
