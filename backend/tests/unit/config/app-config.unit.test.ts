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
