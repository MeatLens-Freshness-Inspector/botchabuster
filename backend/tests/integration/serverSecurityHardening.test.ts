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

async function loadApp(): Promise<Express> {
  const serverModule = await import("../../src/server.ts");
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

test("non-safe auth requests reject disallowed origins before controller logic runs", async () => {
  const { baseUrl, close } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/auth/sign-in`, {
      method: "POST",
      headers: {
        Origin: "https://evil.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const payload = await response.json() as { error?: string };
    assert.equal(response.status, 403);
    assert.match(payload.error ?? "", /origin/i);
  } finally {
    await close();
  }
});

test("cookie-authenticated mutating requests reject a missing csrf token", async () => {
  const { AppSessionService } = await import("../../src/services/AppSessionService");
  const { profileService } = await import("../../src/services/ProfileService");
  const originalGetPrivilegeSummary = profileService.getPrivilegeSummary.bind(profileService);

  profileService.getPrivilegeSummary = async () => ({
    roles: [],
    primaryRole: "inspector",
    isAdmin: false,
    isDeveloper: false,
  });

  const issuedAt = Date.now();
  const sessionService = new AppSessionService(process.env.APP_SESSION_SECRET ?? "app-session-secret", 3600, () => issuedAt);
  const session = sessionService.createSession({
    id: "user-1",
    email: "inspector@example.com",
  });

  const { baseUrl, close } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        Cookie: `meatlens_session=${session.access_token}`,
        Origin: "http://localhost:8080",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: "hello",
          },
        ],
      }),
    });

    const payload = await response.json() as { error?: string };
    assert.equal(response.status, 403);
    assert.match(payload.error ?? "", /csrf/i);
  } finally {
    profileService.getPrivilegeSummary = originalGetPrivilegeSummary;
    await close();
  }
});

test("chat requests are rate limited per authenticated user", async () => {
  const { authService } = await import("../../src/services/AuthService");
  const { profileService } = await import("../../src/services/ProfileService");
  const originalGetUserByAccessToken = authService.getUserByAccessToken.bind(authService);
  const originalGetPrivilegeSummary = profileService.getPrivilegeSummary.bind(profileService);

  authService.getUserByAccessToken = async (accessToken: string) => {
    assert.equal(accessToken, "session-token");
    return {
      id: "user-1",
      email: "inspector@example.com",
    };
  };

  profileService.getPrivilegeSummary = async (userId: string) => {
    assert.equal(userId, "user-1");
    return {
      roles: [],
      primaryRole: "inspector",
      isAdmin: false,
      isDeveloper: false,
    };
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
    profileService.getPrivilegeSummary = originalGetPrivilegeSummary;
    await close();
  }
});
