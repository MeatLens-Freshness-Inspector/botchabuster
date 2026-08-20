import assert from "node:assert/strict";
import test from "node:test";

import {
  createCorsOptions,
  getAllowedOrigins,
  isOriginAllowed,
  parseAllowedOrigins,
} from "../../../src/config/cors";

test("parseAllowedOrigins trims whitespace and removes empty entries", () => {
  assert.deepEqual(
    parseAllowedOrigins(" https://app.example.com , , https://admin.example.com "),
    ["https://app.example.com", "https://admin.example.com"],
  );
});

test("isOriginAllowed matches exact origins and wildcard preview domains", () => {
  const allowedOrigins = ["https://meatlens.netlify.app", "https://*--meatlens.netlify.app"];

  assert.equal(isOriginAllowed("https://meatlens.netlify.app", allowedOrigins), true);
  assert.equal(isOriginAllowed("https://deploy-preview-12--meatlens.netlify.app", allowedOrigins), true);
  assert.equal(isOriginAllowed("https://other-app.netlify.app", allowedOrigins), false);
});

test("getAllowedOrigins falls back to localhost origins outside production", () => {
  assert.deepEqual(
    getAllowedOrigins({ NODE_ENV: "development" } as NodeJS.ProcessEnv),
    [
      "http://localhost:8080",
      "http://127.0.0.1:8080",
      "http://localhost:4173",
      "http://127.0.0.1:4173",
      "capacitor://localhost",
      "http://localhost",
    ],
  );
});

test("getAllowedOrigins requires explicit origins in production", () => {
  assert.deepEqual(getAllowedOrigins({ NODE_ENV: "production" } as NodeJS.ProcessEnv), []);
});

test("createCorsOptions allows requests without an origin header", async () => {
  const options = createCorsOptions([]);

  await new Promise<void>((resolve, reject) => {
    options.origin?.(undefined, (error, allow) => {
      try {
        assert.equal(error, null);
        assert.equal(Boolean(allow), true);
        resolve();
      } catch (assertionError) {
        reject(assertionError);
      }
    });
  });
});

test("createCorsOptions enables credentials, exposes csrf headers, and echoes allowed origins", async () => {
  const options = createCorsOptions(["https://meatlens.netlify.app"]);

  assert.equal(options.credentials, true);
  assert.ok(options.allowedHeaders?.includes("Authorization"));
  assert.ok(options.allowedHeaders?.includes("Content-Type"));
  assert.ok(options.allowedHeaders?.includes("X-CSRF-Token"));

  await new Promise<void>((resolve, reject) => {
    options.origin?.("https://meatlens.netlify.app", (error, allow) => {
      try {
        assert.equal(error, null);
        assert.equal(allow, "https://meatlens.netlify.app");
        resolve();
      } catch (assertionError) {
        reject(assertionError);
      }
    });
  });
});

test("createCorsOptions exposes a client-safe 403 for disallowed origins", async () => {
  const options = createCorsOptions(["https://allowed.example"]);
  await new Promise<void>((resolve, reject) => {
    options.origin?.("https://evil.example", (error) => {
      try {
        assert.equal((error as Error & { status?: number }).status, 403);
        resolve();
      } catch (assertionError) {
        reject(assertionError);
      }
    });
  });
});
