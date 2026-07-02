import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import type { Express } from "express";
import { authService } from "../src/services/AuthService";
import { profileService } from "../src/services/ProfileService";

process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";
process.env.AUDIT_LOG_KEY = process.env.AUDIT_LOG_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

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

test("api responses include baseline security headers", async () => {
  const { baseUrl, close } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/analysis/health`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  } finally {
    await close();
  }
});

test("access-code validation is no longer publicly callable", async () => {
  const { baseUrl, close } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/access-codes/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: "INVITE-123" }),
    });

    const payload = await response.json() as { error?: string };

    assert.equal(response.status, 401);
    assert.match(payload.error ?? "", /authentication required/i);
  } finally {
    await close();
  }
});

test("public auth endpoints are rate limited after repeated requests", async () => {
  const { baseUrl, close } = await startTestServer();

  try {
    const statuses: number[] = [];
    let retryAfter: string | null = null;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await fetch(`${baseUrl}/api/auth/sign-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      statuses.push(response.status);

      if (response.status === 429) {
        retryAfter = response.headers.get("retry-after");
        break;
      }
    }

    assert.ok(statuses.includes(429), `Expected auth rate limiting, got statuses: ${statuses.join(", ")}`);
    assert.ok(retryAfter, "Expected Retry-After header on rate-limited auth responses");
  } finally {
    await close();
  }
});

test("chat requests are rate limited per authenticated user", async () => {
  const originalGetUserByAccessToken = authService.getUserByAccessToken.bind(authService);
  const originalHasRole = profileService.hasRole.bind(profileService);

  authService.getUserByAccessToken = async (accessToken: string) => {
    assert.equal(accessToken, "session-token");
    return {
      id: "user-1",
      email: "inspector@example.com",
    };
  };

  profileService.hasRole = async (userId: string, role: string) => {
    assert.equal(userId, "user-1");
    assert.equal(role, "admin");
    return false;
  };

  const { baseUrl, close } = await startTestServer();

  try {
    const statuses: number[] = [];
    let retryAfter: string | null = null;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "Please write code for me.",
            },
          ],
        }),
      });

      statuses.push(response.status);

      if (response.status === 429) {
        retryAfter = response.headers.get("retry-after");
        break;
      }
    }

    assert.ok(statuses.includes(429), `Expected chat rate limiting, got statuses: ${statuses.join(", ")}`);
    assert.ok(retryAfter, "Expected Retry-After header on rate-limited chat responses");
  } finally {
    authService.getUserByAccessToken = originalGetUserByAccessToken;
    profileService.hasRole = originalHasRole;
    await close();
  }
});
