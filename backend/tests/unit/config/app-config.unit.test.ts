import assert from "node:assert/strict";
import { test } from "node:test";
import { createAppConfig } from "../../../src/config/app.config";
import { parseEnvironment } from "../../../src/config/env";

const environment = parseEnvironment({
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_KEY: "service",
  SUPABASE_PUBLISHABLE_KEY: "publishable",
  APP_SESSION_SECRET: "session-secret",
});

test("createAppConfig supplies bounded upload and security defaults", () => {
  const config = createAppConfig(environment, {});

  assert.equal(config.maxFileSize, 10 * 1024 * 1024);
  assert.equal(config.uploadDir, "./uploads");
  assert.equal(config.appSessionCookieName, "meatlens_session");
  assert.equal(config.csrfTokenSecret, "session-secret");
  assert.equal(config.appSessionCookieSecure, false);
  assert.equal(config.sessionIdleTimeoutSeconds, 900);
  assert.equal(config.sessionCleanupIntervalMs, 60_000);
});

test("createAppConfig bounds and overrides session cleanup timing", () => {
  const config = createAppConfig(environment, {
    SESSION_IDLE_TIMEOUT_SECONDS: "600",
    SESSION_CLEANUP_INTERVAL_SECONDS: "30",
  });

  assert.equal(config.sessionIdleTimeoutSeconds, 600);
  assert.equal(config.sessionCleanupIntervalMs, 30_000);

  const bounded = createAppConfig(environment, {
    SESSION_IDLE_TIMEOUT_SECONDS: "10",
    SESSION_CLEANUP_INTERVAL_SECONDS: "120",
  });

  assert.equal(bounded.sessionIdleTimeoutSeconds, 60);
  assert.equal(bounded.sessionCleanupIntervalMs, 60_000);
});

test("createAppConfig honors explicit boolean security settings", () => {
  const config = createAppConfig(environment, {
    APP_SESSION_COOKIE_SECURE: "true",
    CSRF_TOKEN_SECRET: "csrf-secret",
    UPLOAD_DIR: "./tmp/uploads",
  });

  assert.equal(config.appSessionCookieSecure, true);
  assert.equal(config.csrfTokenSecret, "csrf-secret");
  assert.equal(config.uploadDir, "./tmp/uploads");
});
