import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import type { Express } from "express";

process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";
process.env.AUDIT_LOG_KEY = process.env.AUDIT_LOG_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || "http://localhost:8080,https://meatlens.netlify.app";
process.env.APP_SESSION_SECRET = process.env.APP_SESSION_SECRET || "app-session-secret";
process.env.CSRF_TOKEN_SECRET = process.env.CSRF_TOKEN_SECRET || "csrf-token-secret";
process.env.APP_SESSION_COOKIE_SECURE = process.env.APP_SESSION_COOKIE_SECURE || "true";

async function loadApp(): Promise<Express> {
  const serverModule = await import("../src/server.ts");
  const exportedValue = serverModule.default as unknown;

  if (typeof exportedValue === "function" && "listen" in exportedValue) {
    return exportedValue as Express;
  }

  if (
    exportedValue &&
    typeof exportedValue === "object" &&
    "default" in exportedValue &&
    typeof (exportedValue as { default?: unknown }).default === "function"
  ) {
    return (exportedValue as { default: Express }).default;
  }

  throw new Error("Failed to load Express app from server module");
}

async function startTestServer(): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const app = await loadApp();
  const server = app.listen(0) as Server;
  await once(server, "listening");

  const address = server.address() as AddressInfo | null;
  if (!address) {
    throw new Error("Server did not expose a listening address");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
  };
}

async function createCookieFixture(userId = "admin-1", email = "admin@example.com"): Promise<string> {
  const { AppSessionService } = await import("../src/services/AppSessionService");
  const sessionService = new AppSessionService(process.env.APP_SESSION_SECRET ?? "app-session-secret", 3600, () => Date.now());
  return sessionService.createSession({ id: userId, email }).access_token;
}

test("protected admin data endpoints preserve session-limit 429 responses instead of downgrading them to 401", async () => {
  const { authService } = await import("../src/services/AuthService");
  const { profileService } = await import("../src/services/ProfileService");
  const { getSessionLimitService } = await import("../src/services/SessionLimitService");

  const originalGetUserByAccessToken = authService.getUserByAccessToken.bind(authService);
  const originalHasRole = profileService.hasRole.bind(profileService);
  const sessionLimit = getSessionLimitService();
  const originalHasSession = sessionLimit.hasSession.bind(sessionLimit);
  const originalPruneExpiredSessions = sessionLimit.pruneExpiredSessions.bind(sessionLimit);
  const originalIsAtLimit = sessionLimit.isAtLimit.bind(sessionLimit);
  const originalRegisterSession = sessionLimit.registerSession.bind(sessionLimit);

  authService.getUserByAccessToken = async () => ({
    id: "admin-1",
    email: "admin@example.com",
  });
  profileService.hasRole = async () => true;
  sessionLimit.hasSession = async () => false;
  sessionLimit.pruneExpiredSessions = async () => undefined;
  sessionLimit.isAtLimit = async () => true;
  sessionLimit.registerSession = async () => {
    assert.fail("device-slot registration should not happen after a limit rejection");
  };

  const sessionCookie = await createCookieFixture();
  const { baseUrl, close } = await startTestServer();

  try {
    for (const path of [
      "/api/access-codes",
      "/api/inspections?limit=200&offset=0&scope=all",
    ]) {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: {
          Cookie: `meatlens_session=${sessionCookie}`,
          Origin: "http://localhost:8080",
        },
      });
      const body = await response.json() as { error?: string };

      assert.equal(response.status, 429);
      assert.match(body.error ?? "", /maximum number of devices/i);
    }
  } finally {
    authService.getUserByAccessToken = originalGetUserByAccessToken;
    profileService.hasRole = originalHasRole;
    sessionLimit.hasSession = originalHasSession;
    sessionLimit.pruneExpiredSessions = originalPruneExpiredSessions;
    sessionLimit.isAtLimit = originalIsAtLimit;
    sessionLimit.registerSession = originalRegisterSession;
    await close();
  }
});
