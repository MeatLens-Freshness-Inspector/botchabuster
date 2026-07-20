import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import type { Express, NextFunction, Request, Response } from "express";
import { globalErrorHandler } from "../../src/middleware/errorHandler";

process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";
process.env.AUDIT_LOG_KEY = process.env.AUDIT_LOG_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

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

async function startTestServer(configureApp?: (app: Express) => void): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const app = await loadApp();
  configureApp?.(app);

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

test("malformed JSON requests return a JSON 400 response", async () => {
  const { baseUrl, close } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/auth/sign-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{\"email\":",
    });

    const contentType = response.headers.get("content-type") || "";
    const responseText = await response.text();
    const payload = contentType.match(/application\/json/i)
      ? JSON.parse(responseText) as { error?: string }
      : null;

    assert.equal(response.status, 400);
    assert.match(contentType, /application\/json/i);
    assert.equal(payload?.error, "Invalid JSON request body");
  } finally {
    await close();
  }
});

test("forwarded route errors return a JSON 500 response", async () => {
  const app = express();
  app.get("/boom", (_req: Request, _res: Response, next: NextFunction) => {
    next(new Error("Synthetic route failure"));
  });
  app.use(globalErrorHandler);
  const originalConsoleError = console.error;
  console.error = () => {};

  const server = app.listen(0) as Server;
  await once(server, "listening");
  const address = server.address() as AddressInfo | null;
  if (!address) {
    throw new Error("Server did not expose a listening address");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const response = await fetch(`${baseUrl}/boom`);
    const contentType = response.headers.get("content-type") || "";
    const responseText = await response.text();
    const payload = contentType.match(/application\/json/i)
      ? JSON.parse(responseText) as { error?: string }
      : null;

    assert.equal(response.status, 500);
    assert.match(contentType, /application\/json/i);
    assert.equal(payload?.error, "Internal server error");
  } finally {
    console.error = originalConsoleError;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});
