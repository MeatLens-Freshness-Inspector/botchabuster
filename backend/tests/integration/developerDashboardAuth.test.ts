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
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || "http://localhost:8080";
process.env.APP_SESSION_SECRET = process.env.APP_SESSION_SECRET || "app-session-secret";
process.env.CSRF_TOKEN_SECRET = process.env.CSRF_TOKEN_SECRET || "csrf-token-secret";

async function startTestServer(): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const serverModule = await import("../../src/server.ts");
  const app = serverModule.default as Express;
  const server = app.listen(0) as Server;
  await once(server, "listening");
  const address = server.address() as AddressInfo;

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

test("developer dashboard overview denies plain admins and allows developers", async () => {
  const { authService } = await import("../../src/services/AuthService");
  const { profileService } = await import("../../src/services/ProfileService");
  const { developerDashboardService } = await import("../../src/services/DeveloperDashboardService");

  const originalGetUserByAccessToken = authService.getUserByAccessToken.bind(authService);
  const originalGetUserRoles = profileService.getUserRoles.bind(profileService);
  const originalGetOverview = developerDashboardService.getOverview.bind(developerDashboardService);

  authService.getUserByAccessToken = async (accessToken: string) => {
    if (accessToken === "developer-token") {
      return { id: "developer-1", email: "developer@example.com" };
    }

    return { id: "admin-1", email: "admin@example.com" };
  };
  profileService.getUserRoles = async (userId: string) => [
    {
      id: `role-${userId}`,
      user_id: userId,
      role: userId === "developer-1" ? "developer" : "admin",
    },
  ];
  developerDashboardService.getOverview = async () => ({
    highlightedFamilies: {
      mobilenetv2: null,
      mobilenetv3: null,
    },
    latestRuns: [],
  });

  const { baseUrl, close } = await startTestServer();

  try {
    const denied = await fetch(`${baseUrl}/api/developer-dashboard/overview`, {
      headers: { Authorization: "Bearer admin-token" },
    });
    assert.equal(denied.status, 403);

    const allowed = await fetch(`${baseUrl}/api/developer-dashboard/overview`, {
      headers: { Authorization: "Bearer developer-token" },
    });
    assert.equal(allowed.status, 200);
    assert.deepEqual(await allowed.json(), {
      highlightedFamilies: {
        mobilenetv2: null,
        mobilenetv3: null,
      },
      latestRuns: [],
    });
  } finally {
    authService.getUserByAccessToken = originalGetUserByAccessToken;
    profileService.getUserRoles = originalGetUserRoles;
    developerDashboardService.getOverview = originalGetOverview;
    await close();
  }
});
