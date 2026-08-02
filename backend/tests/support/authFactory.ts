import "../setup/env";
import assert from "node:assert/strict";
import { AppSessionService } from "../../src/services/AppSessionService";
import { CsrfTokenService } from "../../src/services/CsrfTokenService";
import { createUserFixture } from "./fixtures";

export function parseSessionCookie(setCookieHeader: string): string {
  const match = /meatlens_session=([^;]+)/.exec(setCookieHeader);
  assert.ok(match, `Expected meatlens_session cookie in ${setCookieHeader}`);
  return match[1];
}

export async function createCookieFixture(userOverrides: Partial<{ id: string; email: string }> = {}) {
  const user = createUserFixture(userOverrides);
  const issuedAt = Date.now();
  const sessionService = new AppSessionService(process.env.APP_SESSION_SECRET ?? "app-session-secret", 3600, () => issuedAt);
  const csrfService = new CsrfTokenService(process.env.CSRF_TOKEN_SECRET ?? "csrf-token-secret", 900, () => issuedAt);
  const session = sessionService.createSession(user);
  const sessionId = sessionService.getSessionId(session.access_token);

  assert.ok(sessionId, "Expected session cookie to contain a stable session ID");

  return {
    user,
    session,
    csrfToken: csrfService.issueToken({
      sessionId,
      userId: user.id,
    }),
  };
}
