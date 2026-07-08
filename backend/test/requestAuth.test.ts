import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";

function createRequest(options: {
  authorization?: string;
  cookie?: string;
  origin?: string;
  csrfToken?: string;
  method?: string;
} = {}): Request {
  return {
    method: options.method ?? "GET",
    header(name: string) {
      switch (name.toLowerCase()) {
        case "authorization":
          return options.authorization;
        case "cookie":
          return options.cookie;
        case "origin":
          return options.origin;
        case "x-csrf-token":
          return options.csrfToken;
        default:
          return undefined;
      }
    },
  } as Request;
}

async function createAppSessionCookie(userId = "user-1", email = "inspector@example.com"): Promise<string> {
  process.env.APP_SESSION_SECRET = process.env.APP_SESSION_SECRET || "app-session-secret";
  const { AppSessionService } = await import("../src/services/AppSessionService");
  const sessionService = new AppSessionService(process.env.APP_SESSION_SECRET, 3600, () => Date.now());
  return sessionService.createSession({ id: userId, email }).access_token;
}

test("resolveRequestAuthContext rejects requests without a cookie or bearer token", async () => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
  process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";

  const { RequestAuthError, resolveRequestAuthContext } = await import("../src/middleware/auth");

  await assert.rejects(
    async () => resolveRequestAuthContext(createRequest()),
    (error: unknown) =>
      error instanceof RequestAuthError &&
      error.status === 401 &&
      /authentication required/i.test(error.message),
  );
});

test("resolveRequestAuthContext prefers the app-session cookie when present", async () => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
  process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";

  const { resolveRequestAuthContext } = await import("../src/middleware/auth");
  const { authService } = await import("../src/services/AuthService");
  const { profileService } = await import("../src/services/ProfileService");

  const originalGetUserByAccessToken = authService.getUserByAccessToken.bind(authService);
  const originalHasRole = profileService.hasRole.bind(profileService);

  authService.getUserByAccessToken = async (accessToken: string) => {
    assert.equal(accessToken, "cookie-session-token");
    return {
      id: "user-1",
      email: "inspector@example.com",
    };
  };
  profileService.hasRole = async () => false;

  try {
    const authContext = await resolveRequestAuthContext(
      createRequest(
        {
          authorization: "Bearer bearer-token",
          cookie: "other=value; meatlens_session=cookie-session-token; something=else",
        },
      ),
    );
    assert.deepEqual(authContext, {
      userId: "user-1",
      email: "inspector@example.com",
      isAdmin: false,
    });
  } finally {
    authService.getUserByAccessToken = originalGetUserByAccessToken;
    profileService.hasRole = originalHasRole;
  }
});

test("resolveRequestAuthContext still accepts a bearer header when no cookie exists", async () => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
  process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";

  const { resolveRequestAuthContext } = await import("../src/middleware/auth");
  const { authService } = await import("../src/services/AuthService");
  const { profileService } = await import("../src/services/ProfileService");

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
    return true;
  };

  try {
    const authContext = await resolveRequestAuthContext(createRequest({ authorization: "Bearer session-token" }));
    assert.deepEqual(authContext, {
      userId: "user-1",
      email: "inspector@example.com",
      isAdmin: true,
    });
  } finally {
    authService.getUserByAccessToken = originalGetUserByAccessToken;
    profileService.hasRole = originalHasRole;
  }
});

test("assertSelf rejects attempts to mutate another user's account", async () => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
  process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";

  const { RequestAuthError, assertSelf } = await import("../src/middleware/auth");

  assert.throws(
    () => assertSelf({ userId: "user-1", email: "inspector@example.com", isAdmin: false }, "user-2"),
    (error: unknown) =>
      error instanceof RequestAuthError &&
      error.status === 403 &&
      /forbidden/i.test(error.message),
  );
});

test("assertSelfOrAdmin allows administrators to access another user's record", async () => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
  process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";

  const { assertSelfOrAdmin } = await import("../src/middleware/auth");

  assert.doesNotThrow(() =>
    assertSelfOrAdmin({ userId: "admin-1", email: "admin@example.com", isAdmin: true }, "user-2"),
  );
});

test("resolveTrackedRequestAuthContext only performs session tracking once per request", async () => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
  process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";

  const token = await createAppSessionCookie();
  const req = createRequest({
    cookie: `meatlens_session=${token}`,
  });

  const { resolveTrackedRequestAuthContext } = await import("../src/middleware/auth");
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

  let registerCalls = 0;

  authService.getUserByAccessToken = async (accessToken: string) => {
    assert.equal(accessToken, token);
    return {
      id: "user-1",
      email: "inspector@example.com",
    };
  };
  profileService.hasRole = async () => false;
  sessionLimit.hasSession = async () => false;
  sessionLimit.pruneExpiredSessions = async () => undefined;
  sessionLimit.isAtLimit = async () => false;
  sessionLimit.registerSession = async () => {
    registerCalls += 1;
  };

  try {
    const first = await resolveTrackedRequestAuthContext(req);
    const second = await resolveTrackedRequestAuthContext(req);

    assert.deepEqual(first, {
      userId: "user-1",
      email: "inspector@example.com",
      isAdmin: false,
    });
    assert.deepEqual(second, first);
    assert.equal(registerCalls, 1);
  } finally {
    authService.getUserByAccessToken = originalGetUserByAccessToken;
    profileService.hasRole = originalHasRole;
    sessionLimit.hasSession = originalHasSession;
    sessionLimit.pruneExpiredSessions = originalPruneExpiredSessions;
    sessionLimit.isAtLimit = originalIsAtLimit;
    sessionLimit.registerSession = originalRegisterSession;
  }
});

test("resolveTrackedRequestAuthContext rejects unsafe cookie requests without a csrf token", async () => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
  process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";
  process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || "http://localhost:8080";

  const token = await createAppSessionCookie();
  const req = createRequest({
    method: "POST",
    cookie: `meatlens_session=${token}`,
    origin: "http://localhost:8080",
  });

  const { RequestAuthError, resolveTrackedRequestAuthContext } = await import("../src/middleware/auth");
  const { authService } = await import("../src/services/AuthService");
  const { profileService } = await import("../src/services/ProfileService");
  const { getSessionLimitService } = await import("../src/services/SessionLimitService");

  const originalGetUserByAccessToken = authService.getUserByAccessToken.bind(authService);
  const originalHasRole = profileService.hasRole.bind(profileService);
  const sessionLimit = getSessionLimitService();
  const originalHasSession = sessionLimit.hasSession.bind(sessionLimit);

  authService.getUserByAccessToken = async () => ({
    id: "user-1",
    email: "inspector@example.com",
  });
  profileService.hasRole = async () => false;
  sessionLimit.hasSession = async () => true;

  try {
    await assert.rejects(
      async () => resolveTrackedRequestAuthContext(req),
      (error: unknown) =>
        error instanceof RequestAuthError &&
        error.status === 403 &&
        /csrf token required/i.test(error.message),
    );
  } finally {
    authService.getUserByAccessToken = originalGetUserByAccessToken;
    profileService.hasRole = originalHasRole;
    sessionLimit.hasSession = originalHasSession;
  }
});
