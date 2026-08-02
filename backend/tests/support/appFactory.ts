import "../setup/env";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Express } from "express";
import { createApp } from "../../src/app";
import { closeServer } from "../setup/lifecycle";

export function createTestApp(): Express {
  return createApp();
}

export async function startTestServer(app = createTestApp()): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const server = app.listen(0) as Server;
  await once(server, "listening");

  const address = server.address() as AddressInfo | null;
  if (!address) {
    throw new Error("Server did not expose a listening address");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => closeServer(server),
  };
}
