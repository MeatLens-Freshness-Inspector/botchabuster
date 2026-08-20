import assert from "node:assert/strict";
import { test } from "node:test";
import "../setup/env";
import { createGracefulShutdown, stopServerServices } from "../../src/server";

test("server shutdown stops session cleanup and the lazy chat hub", async () => {
  const calls: string[] = [];

  await stopServerServices(
    { stop: () => calls.push("session-cleanup") },
    { shutdown: async () => { calls.push("chat-realtime"); } },
  );

  assert.deepEqual(calls, ["session-cleanup", "chat-realtime"]);
});

test("graceful shutdown stops realtime before closing the HTTP listener", async () => {
  const calls: string[] = [];
  let closeAllConnections = 0;
  const server = {
    close(callback: () => void) {
      calls.push("server-close");
      callback();
    },
    closeAllConnections() { closeAllConnections += 1; },
  };
  const shutdown = createGracefulShutdown(
    server,
    { stop: () => calls.push("session-cleanup") },
    { shutdown: async () => { calls.push("chat-realtime"); } },
  );
  await shutdown();
  await shutdown();
  assert.deepEqual(calls, ["session-cleanup", "chat-realtime", "server-close"]);
  assert.equal(closeAllConnections, 0);
});
