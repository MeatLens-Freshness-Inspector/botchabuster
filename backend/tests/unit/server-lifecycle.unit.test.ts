import assert from "node:assert/strict";
import { test } from "node:test";
import "../setup/env";
import { stopServerServices } from "../../src/server";

test("server shutdown stops session cleanup and the lazy chat hub", async () => {
  const calls: string[] = [];

  await stopServerServices(
    { stop: () => calls.push("session-cleanup") },
    { shutdown: async () => { calls.push("chat-realtime"); } },
  );

  assert.deepEqual(calls, ["session-cleanup", "chat-realtime"]);
});
