import assert from "node:assert/strict";
import test from "node:test";

import { getSessionCookieSameSite, shouldUseSecureSessionCookie } from "../src/security/sessionCookie";

test("defaults to secure cookies for https origins when no override is configured", () => {
  assert.equal(
    shouldUseSecureSessionCookie({
      cookieSecureConfigured: false,
      cookieSecure: false,
      origin: "https://meatlens.netlify.app",
      host: "meatlens-backend.onrender.com",
    }),
    true,
  );
});

test("keeps localhost development cookies insecure by default", () => {
  assert.equal(
    shouldUseSecureSessionCookie({
      cookieSecureConfigured: false,
      cookieSecure: false,
      origin: "http://localhost:8080",
      host: "localhost:3001",
    }),
    false,
  );
});

test("honors an explicit secure-cookie override", () => {
  assert.equal(
    shouldUseSecureSessionCookie({
      cookieSecureConfigured: true,
      cookieSecure: true,
      origin: "http://localhost:8080",
      host: "localhost:3001",
    }),
    true,
  );
});

test("uses SameSite=None only for secure cookies and falls back to Lax for insecure localhost cookies", () => {
  assert.equal(getSessionCookieSameSite(true), "none");
  assert.equal(getSessionCookieSameSite(false), "lax");
});
