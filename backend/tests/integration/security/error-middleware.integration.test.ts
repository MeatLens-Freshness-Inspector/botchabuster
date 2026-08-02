import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import type { Express, NextFunction, Request, Response } from "express";
import { globalErrorHandler } from "../../../src/middleware/errorHandler";
import "../../setup/env";
import { createTestApp, startTestServer } from "../../support/appFactory";

async function startConfiguredTestServer(configureApp?: (app: Express) => void): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const app = createTestApp();
  configureApp?.(app);
  return startTestServer(app);
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
