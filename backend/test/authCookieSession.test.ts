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

function parseSessionCookie(setCookieHeader: string): string {
  const match = /meatlens_session=([^;]+)/.exec(setCookieHeader);
  assert.ok(match, `Expected meatlens_session cookie in ${setCookieHeader}`);
  return match[1];
}

function createProfile(userId: string) {
  return {
    id: userId,
    full_name: "Inspector Example",
    avatar_url: null,
    inspector_code: "INS-123",
    report_organization: "dti",
    is_dark_mode: false,
    show_detailed_results: false,
    onboarding_completed_at: "2026-07-01T00:00:00.000Z",
    onboarding_version: 1,
    location: "Olongapo",
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
  };
}

async function createCookieFixture(userId = "user-1", email = "inspector@example.com") {
  const { AppSessionService } = await import("../src/services/AppSessionService");
  const { CsrfTokenService } = await import("../src/services/CsrfTokenService");

  const issuedAt = Date.now();
  const sessionService = new AppSessionService(process.env.APP_SESSION_SECRET ?? "app-session-secret", 3600, () => issuedAt);
  const csrfService = new CsrfTokenService(process.env.CSRF_TOKEN_SECRET ?? "csrf-token-secret", 900, () => issuedAt);
  const session = sessionService.createSession({ id: userId, email });
  const sessionId = sessionService.getSessionId(session.access_token);

  assert.ok(sessionId, "Expected session cookie to contain a stable session ID");

  return {
    session,
    csrfToken: csrfService.issueToken({
      sessionId,
      userId,
    }),
  };
}

test("sign-in sets a secure cookie, returns a bootstrap payload, and registers the device slot", async () => {
  const { authService } = await import("../src/services/AuthService");
  const { profileService } = await import("../src/services/ProfileService");
  const { auditLogService } = await import("../src/services/AuditLogService");
  const { getSessionLimitService } = await import("../src/services/SessionLimitService");

  const originalSignIn = authService.signIn.bind(authService);
  const originalGetUserRoles = profileService.getUserRoles.bind(profileService);
  const originalGetProfile = profileService.getProfile.bind(profileService);
  const originalWriteAuditLog = auditLogService.write.bind(auditLogService);
  const sessionLimit = getSessionLimitService();
  const originalHasSession = sessionLimit.hasSession.bind(sessionLimit);
  const originalPruneExpiredSessions = sessionLimit.pruneExpiredSessions.bind(sessionLimit);
  const originalIsAtLimit = sessionLimit.isAtLimit.bind(sessionLimit);
  const originalRegisterSession = sessionLimit.registerSession.bind(sessionLimit);

  const user = { id: "user-1", email: "inspector@example.com" };
  const profile = createProfile(user.id);
  let registeredToken: string | null = null;

  authService.signIn = async () => ({ user, session: null });
  profileService.getUserRoles = async () => [];
  profileService.getProfile = async () => profile;
  auditLogService.write = async () => undefined;
  sessionLimit.hasSession = async () => false;
  sessionLimit.pruneExpiredSessions = async () => undefined;
  sessionLimit.isAtLimit = async () => false;
  sessionLimit.registerSession = async (_userId, accessToken) => {
    registeredToken = accessToken;
  };

  const { baseUrl, close } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/auth/sign-in`, {
      method: "POST",
      headers: {
        Origin: "http://localhost:8080",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: user.email, password: "correct-horse-battery-staple" }),
    });

    const body = await response.json() as Record<string, unknown>;
    const setCookie = response.headers.get("set-cookie") ?? "";
    const cookieToken = parseSessionCookie(setCookie);

    assert.equal(response.status, 200);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /Secure/i);
    assert.match(setCookie, /SameSite=None/i);
    assert.match(setCookie, /Path=\//i);
    assert.match(setCookie, /(Max-Age|Expires)=/i);
    assert.equal(registeredToken, cookieToken);

    assert.equal((body.user as { id?: string }).id, user.id);
    assert.equal((body.profile as { id?: string }).id, profile.id);
    assert.equal(body.isAdmin, false);
    assert.equal(typeof body.csrfToken, "string");
    assert.equal(typeof body.authenticatedAt, "string");
    assert.equal(typeof body.offlineExpiresAt, "string");
    assert.equal((body.session as { access_token?: string }).access_token, cookieToken);
    assert.equal((body.session as { token_type?: string }).token_type, "bearer");
    assert.equal("access_token" in body, false);
    assert.equal("refresh_token" in body, false);
  } finally {
    authService.signIn = originalSignIn;
    profileService.getUserRoles = originalGetUserRoles;
    profileService.getProfile = originalGetProfile;
    auditLogService.write = originalWriteAuditLog;
    sessionLimit.hasSession = originalHasSession;
    sessionLimit.pruneExpiredSessions = originalPruneExpiredSessions;
    sessionLimit.isAtLimit = originalIsAtLimit;
    sessionLimit.registerSession = originalRegisterSession;
    await close();
  }
});

test("sign-in rejects before issuing a session cookie when the device limit is reached", async () => {
  const { authService } = await import("../src/services/AuthService");
  const { profileService } = await import("../src/services/ProfileService");
  const { auditLogService } = await import("../src/services/AuditLogService");
  const { getSessionLimitService } = await import("../src/services/SessionLimitService");

  const originalSignIn = authService.signIn.bind(authService);
  const originalGetUserRoles = profileService.getUserRoles.bind(profileService);
  const originalGetProfile = profileService.getProfile.bind(profileService);
  const originalWriteAuditLog = auditLogService.write.bind(auditLogService);
  const sessionLimit = getSessionLimitService();
  const originalHasSession = sessionLimit.hasSession.bind(sessionLimit);
  const originalPruneExpiredSessions = sessionLimit.pruneExpiredSessions.bind(sessionLimit);
  const originalIsAtLimit = sessionLimit.isAtLimit.bind(sessionLimit);
  const originalRegisterSession = sessionLimit.registerSession.bind(sessionLimit);

  const user = { id: "admin-1", email: "admin@example.com" };
  const profile = createProfile(user.id);
  let auditCalls = 0;
  let registerCalls = 0;

  authService.signIn = async () => ({ user, session: null });
  profileService.getUserRoles = async () => [{ id: "role-1", user_id: user.id, role: "admin" }];
  profileService.getProfile = async () => profile;
  auditLogService.write = async () => {
    auditCalls += 1;
  };
  sessionLimit.hasSession = async () => false;
  sessionLimit.pruneExpiredSessions = async () => undefined;
  sessionLimit.isAtLimit = async () => true;
  sessionLimit.registerSession = async () => {
    registerCalls += 1;
  };

  const { baseUrl, close } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/auth/sign-in`, {
      method: "POST",
      headers: {
        Origin: "http://localhost:8080",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: user.email, password: "correct-horse-battery-staple" }),
    });
    const body = await response.json() as { error?: string };

    assert.equal(response.status, 429);
    assert.match(body.error ?? "", /maximum number of devices/i);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(registerCalls, 0);
    assert.equal(auditCalls, 0);
  } finally {
    authService.signIn = originalSignIn;
    profileService.getUserRoles = originalGetUserRoles;
    profileService.getProfile = originalGetProfile;
    auditLogService.write = originalWriteAuditLog;
    sessionLimit.hasSession = originalHasSession;
    sessionLimit.pruneExpiredSessions = originalPruneExpiredSessions;
    sessionLimit.isAtLimit = originalIsAtLimit;
    sessionLimit.registerSession = originalRegisterSession;
    await close();
  }
});

test("session bootstrap accepts a bearer-backed app session, preserves authenticatedAt, and rotates the csrf token", async () => {
  const { authService } = await import("../src/services/AuthService");
  const { profileService } = await import("../src/services/ProfileService");
  const { auditLogService } = await import("../src/services/AuditLogService");
  const { getSessionLimitService } = await import("../src/services/SessionLimitService");

  const originalSignIn = authService.signIn.bind(authService);
  const originalGetUserRoles = profileService.getUserRoles.bind(profileService);
  const originalGetProfile = profileService.getProfile.bind(profileService);
  const originalWriteAuditLog = auditLogService.write.bind(auditLogService);
  const sessionLimit = getSessionLimitService();
  const originalHasSession = sessionLimit.hasSession.bind(sessionLimit);
  const originalPruneExpiredSessions = sessionLimit.pruneExpiredSessions.bind(sessionLimit);
  const originalIsAtLimit = sessionLimit.isAtLimit.bind(sessionLimit);
  const originalRegisterSession = sessionLimit.registerSession.bind(sessionLimit);

  const user = { id: "user-1", email: "inspector@example.com" };
  const profile = createProfile(user.id);

  authService.signIn = async () => ({ user, session: null });
  profileService.getUserRoles = async () => [];
  profileService.getProfile = async () => profile;
  auditLogService.write = async () => undefined;
  sessionLimit.hasSession = async () => true;
  sessionLimit.pruneExpiredSessions = async () => undefined;
  sessionLimit.isAtLimit = async () => false;
  sessionLimit.registerSession = async () => undefined;

  const { baseUrl, close } = await startTestServer();

  try {
    const signInResponse = await fetch(`${baseUrl}/api/auth/sign-in`, {
      method: "POST",
      headers: {
        Origin: "http://localhost:8080",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: user.email, password: "correct-horse-battery-staple" }),
    });
    const signInBody = await signInResponse.json() as Record<string, unknown>;
    const issuedSession = signInBody.session as { access_token?: string };

    const bootstrapResponse = await fetch(`${baseUrl}/api/auth/session`, {
      headers: {
        Authorization: `Bearer ${issuedSession.access_token ?? ""}`,
      },
    });
    const bootstrapBody = await bootstrapResponse.json() as Record<string, unknown>;

    assert.equal(bootstrapResponse.status, 200);
    assert.equal(bootstrapBody.authenticatedAt, signInBody.authenticatedAt);
    assert.equal(bootstrapBody.offlineExpiresAt, signInBody.offlineExpiresAt);
    assert.notEqual(bootstrapBody.csrfToken, signInBody.csrfToken);
    assert.equal((bootstrapBody.session as { access_token?: string }).access_token, issuedSession.access_token);
  } finally {
    authService.signIn = originalSignIn;
    profileService.getUserRoles = originalGetUserRoles;
    profileService.getProfile = originalGetProfile;
    auditLogService.write = originalWriteAuditLog;
    sessionLimit.hasSession = originalHasSession;
    sessionLimit.pruneExpiredSessions = originalPruneExpiredSessions;
    sessionLimit.isAtLimit = originalIsAtLimit;
    sessionLimit.registerSession = originalRegisterSession;
    await close();
  }
});

test("cookie-authenticated inspection requests reuse the session slot registered at sign-in", async () => {
  const { authService } = await import("../src/services/AuthService");
  const { profileService } = await import("../src/services/ProfileService");
  const { auditLogService } = await import("../src/services/AuditLogService");
  const { inspectionService } = await import("../src/services/InspectionService");
  const { getSessionLimitService } = await import("../src/services/SessionLimitService");

  const originalSignIn = authService.signIn.bind(authService);
  const originalGetUserRoles = profileService.getUserRoles.bind(profileService);
  const originalGetProfile = profileService.getProfile.bind(profileService);
  const originalWriteAuditLog = auditLogService.write.bind(auditLogService);
  const originalGetAll = inspectionService.getAll.bind(inspectionService);
  const sessionLimit = getSessionLimitService();
  const originalHasSession = sessionLimit.hasSession.bind(sessionLimit);
  const originalPruneExpiredSessions = sessionLimit.pruneExpiredSessions.bind(sessionLimit);
  const originalIsAtLimit = sessionLimit.isAtLimit.bind(sessionLimit);
  const originalRegisterSession = sessionLimit.registerSession.bind(sessionLimit);

  const user = { id: "admin-1", email: "admin@example.com" };
  const profile = createProfile(user.id);
  let registeredToken: string | null = null;
  let registerCalls = 0;
  let inspectionArgs: unknown[] | null = null;
  const registeredTokens = new Set<string>();

  authService.signIn = async () => ({ user, session: null });
  profileService.getUserRoles = async () => [{ id: "role-1", user_id: user.id, role: "admin" }];
  profileService.getProfile = async () => profile;
  auditLogService.write = async () => undefined;
  inspectionService.getAll = async (...args) => {
    inspectionArgs = args;
    return [];
  };
  sessionLimit.hasSession = async (accessToken) => registeredTokens.has(accessToken);
  sessionLimit.pruneExpiredSessions = async () => undefined;
  sessionLimit.isAtLimit = async () => false;
  sessionLimit.registerSession = async (_userId, accessToken) => {
    registerCalls += 1;
    registeredTokens.add(accessToken);
    registeredToken = accessToken;
  };

  const { baseUrl, close } = await startTestServer();

  try {
    const signInResponse = await fetch(`${baseUrl}/api/auth/sign-in`, {
      method: "POST",
      headers: {
        Origin: "http://localhost:8080",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: user.email, password: "correct-horse-battery-staple" }),
    });
    const issuedCookie = signInResponse.headers.get("set-cookie") ?? "";
    const cookieToken = parseSessionCookie(issuedCookie);

    assert.equal(signInResponse.status, 200);
    assert.equal(registeredToken, cookieToken);
    assert.equal(registerCalls, 1);

    const inspectionResponse = await fetch(`${baseUrl}/api/inspections?limit=1&offset=0&scope=all`, {
      headers: {
        Cookie: issuedCookie,
      },
    });

    assert.equal(inspectionResponse.status, 200);
    assert.equal(registerCalls, 1);
    assert.deepEqual(inspectionArgs, [1, 0, user.id, "all", true]);
  } finally {
    authService.signIn = originalSignIn;
    profileService.getUserRoles = originalGetUserRoles;
    profileService.getProfile = originalGetProfile;
    auditLogService.write = originalWriteAuditLog;
    inspectionService.getAll = originalGetAll;
    sessionLimit.hasSession = originalHasSession;
    sessionLimit.pruneExpiredSessions = originalPruneExpiredSessions;
    sessionLimit.isAtLimit = originalIsAtLimit;
    sessionLimit.registerSession = originalRegisterSession;
    await close();
  }
});

test("sign-out clears the session cookie and removes the registered app session", async () => {
  const { profileService } = await import("../src/services/ProfileService");
  const { auditLogService } = await import("../src/services/AuditLogService");
  const { getSessionLimitService } = await import("../src/services/SessionLimitService");

  const originalGetUserRoles = profileService.getUserRoles.bind(profileService);
  const originalWriteAuditLog = auditLogService.write.bind(auditLogService);
  const sessionLimit = getSessionLimitService();
  const originalHasSession = sessionLimit.hasSession.bind(sessionLimit);
  const originalRemoveSession = sessionLimit.removeSession.bind(sessionLimit);
  let removedToken: string | null = null;

  profileService.getUserRoles = async () => [];
  auditLogService.write = async () => undefined;
  sessionLimit.hasSession = async () => true;
  sessionLimit.removeSession = async (accessToken) => {
    removedToken = accessToken;
  };

  const { session, csrfToken } = await createCookieFixture();
  const { baseUrl, close } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        Cookie: `meatlens_session=${session.access_token}`,
        Origin: "http://localhost:8080",
        "X-CSRF-Token": csrfToken,
      },
    });

    const setCookie = response.headers.get("set-cookie") ?? "";
    assert.equal(response.status, 204);
    assert.equal(removedToken, session.access_token);
    assert.match(setCookie, /meatlens_session=/i);
    assert.match(setCookie, /(Max-Age=0|Expires=Thu, 01 Jan 1970)/i);
  } finally {
    profileService.getUserRoles = originalGetUserRoles;
    auditLogService.write = originalWriteAuditLog;
    sessionLimit.hasSession = originalHasSession;
    sessionLimit.removeSession = originalRemoveSession;
    await close();
  }
});

test("passkey authenticate verify mirrors the cookie/bootstrap contract and registers the device slot", async () => {
  const { passkeyService } = await import("../src/services/PasskeyService");
  const { authService } = await import("../src/services/AuthService");
  const { profileService } = await import("../src/services/ProfileService");
  const { auditLogService } = await import("../src/services/AuditLogService");
  const { getSessionLimitService } = await import("../src/services/SessionLimitService");

  const originalVerifyAuthentication = passkeyService.verifyAuthentication.bind(passkeyService);
  const originalGetUserRoles = profileService.getUserRoles.bind(profileService);
  const originalGetProfile = profileService.getProfile.bind(profileService);
  const originalWriteAuditLog = auditLogService.write.bind(auditLogService);
  const sessionLimit = getSessionLimitService();
  const originalHasSession = sessionLimit.hasSession.bind(sessionLimit);
  const originalPruneExpiredSessions = sessionLimit.pruneExpiredSessions.bind(sessionLimit);
  const originalIsAtLimit = sessionLimit.isAtLimit.bind(sessionLimit);
  const originalRegisterSession = sessionLimit.registerSession.bind(sessionLimit);

  const user = { id: "user-2", email: "passkey@example.com" };
  const profile = createProfile(user.id);
  let registeredToken: string | null = null;

  passkeyService.verifyAuthentication = async () => ({
    user,
    session: authService.createAppSession(user),
  });
  profileService.getUserRoles = async () => [{ id: "role-1", user_id: user.id, role: "admin" }];
  profileService.getProfile = async () => profile;
  auditLogService.write = async () => undefined;
  sessionLimit.hasSession = async () => false;
  sessionLimit.pruneExpiredSessions = async () => undefined;
  sessionLimit.isAtLimit = async () => false;
  sessionLimit.registerSession = async (_userId, accessToken) => {
    registeredToken = accessToken;
  };

  const { baseUrl, close } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/auth/passkeys/authenticate/verify`, {
      method: "POST",
      headers: {
        Origin: "http://localhost:8080",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        challengeId: "challenge-1",
        credential: { id: "credential-1" },
      }),
    });

    const body = await response.json() as Record<string, unknown>;
    const setCookie = response.headers.get("set-cookie") ?? "";
    const cookieToken = parseSessionCookie(setCookie);

    assert.equal(response.status, 200);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /Secure/i);
    assert.match(setCookie, /SameSite=None/i);
    assert.match(setCookie, /Path=\//i);
    assert.equal(registeredToken, cookieToken);
    assert.equal((body.user as { id?: string }).id, user.id);
    assert.equal((body.profile as { id?: string }).id, profile.id);
    assert.equal(body.isAdmin, true);
    assert.equal(typeof body.csrfToken, "string");
    assert.equal((body.session as { access_token?: string }).access_token, cookieToken);
    assert.equal((body.session as { token_type?: string }).token_type, "bearer");
    assert.equal("access_token" in body, false);
  } finally {
    passkeyService.verifyAuthentication = originalVerifyAuthentication;
    profileService.getUserRoles = originalGetUserRoles;
    profileService.getProfile = originalGetProfile;
    auditLogService.write = originalWriteAuditLog;
    sessionLimit.hasSession = originalHasSession;
    sessionLimit.pruneExpiredSessions = originalPruneExpiredSessions;
    sessionLimit.isAtLimit = originalIsAtLimit;
    sessionLimit.registerSession = originalRegisterSession;
    await close();
  }
});

test("passkey register, list, and delete routes accept cookie auth without an Authorization header", async () => {
  const { passkeyService } = await import("../src/services/PasskeyService");
  const { profileService } = await import("../src/services/ProfileService");
  const { auditLogService } = await import("../src/services/AuditLogService");
  const { getSessionLimitService } = await import("../src/services/SessionLimitService");

  const originalBeginRegistration = passkeyService.beginRegistration.bind(passkeyService);
  const originalListPasskeys = passkeyService.listPasskeys.bind(passkeyService);
  const originalDeletePasskey = passkeyService.deletePasskey.bind(passkeyService);
  const originalGetUserRoles = profileService.getUserRoles.bind(profileService);
  const originalWriteAuditLog = auditLogService.write.bind(auditLogService);
  const sessionLimit = getSessionLimitService();
  const originalHasSession = sessionLimit.hasSession.bind(sessionLimit);
  const listedPasskeys = [{ credentialId: "credential-1", deviceLabel: "Current device", transports: [], createdAt: "2026-07-01T00:00:00.000Z", lastUsedAt: null, localDeviceReady: true }];
  let deletedCredentialId: string | null = null;

  passkeyService.beginRegistration = async () => ({
    challengeId: "challenge-1",
    options: { challenge: "webauthn-challenge" } as never,
  });
  passkeyService.listPasskeys = async () => listedPasskeys;
  passkeyService.deletePasskey = async (_userId, credentialId) => {
    deletedCredentialId = credentialId;
  };
  profileService.getUserRoles = async () => [];
  auditLogService.write = async () => undefined;
  sessionLimit.hasSession = async () => true;

  const { session, csrfToken } = await createCookieFixture();
  const { baseUrl, close } = await startTestServer();

  try {
    const beginRegistrationResponse = await fetch(`${baseUrl}/api/auth/passkeys/register/options`, {
      method: "POST",
      headers: {
        Cookie: `meatlens_session=${session.access_token}`,
        Origin: "http://localhost:8080",
        "X-CSRF-Token": csrfToken,
      },
    });
    assert.equal(beginRegistrationResponse.status, 200);

    const listResponse = await fetch(`${baseUrl}/api/auth/passkeys`, {
      headers: {
        Cookie: `meatlens_session=${session.access_token}`,
      },
    });
    const listed = await listResponse.json() as unknown[];
    assert.equal(listResponse.status, 200);
    assert.equal(listed.length, 1);

    const deleteResponse = await fetch(`${baseUrl}/api/auth/passkeys/credential-1`, {
      method: "DELETE",
      headers: {
        Cookie: `meatlens_session=${session.access_token}`,
        Origin: "http://localhost:8080",
        "X-CSRF-Token": csrfToken,
      },
    });
    assert.equal(deleteResponse.status, 204);
    assert.equal(deletedCredentialId, "credential-1");
  } finally {
    passkeyService.beginRegistration = originalBeginRegistration;
    passkeyService.listPasskeys = originalListPasskeys;
    passkeyService.deletePasskey = originalDeletePasskey;
    profileService.getUserRoles = originalGetUserRoles;
    auditLogService.write = originalWriteAuditLog;
    sessionLimit.hasSession = originalHasSession;
    await close();
  }
});
