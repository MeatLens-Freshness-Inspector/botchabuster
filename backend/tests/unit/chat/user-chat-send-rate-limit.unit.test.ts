import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import type { NextFunction, Request, Response } from "express";
import { createUserChatSendRateLimit } from "../../../src/modules/chat/presentation/user-chat-send-rate-limit";

function invokeLimiter(limiter: ReturnType<typeof createUserChatSendRateLimit>, userId: string) {
  let nextCalls = 0;
  let statusCode = 200;
  let body: unknown = null;
  const headers = new Map<string, string>();
  const req = { auth: { userId } } as unknown as Request;
  const res = {
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value);
    },
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(value: unknown) {
      body = value;
      return res;
    },
  } as unknown as Response;
  limiter(req, res, (() => {
    nextCalls += 1;
  }) as NextFunction);
  return { nextCalls, statusCode, body, headers };
}

test("allows 30 sends per authenticated user per minute and rejects the 31st", () => {
  let now = 1_000_000;
  const limiter = createUserChatSendRateLimit(() => now);

  for (let count = 0; count < 30; count += 1) {
    assert.equal(invokeLimiter(limiter, "user-1").nextCalls, 1);
  }

  const rejected = invokeLimiter(limiter, "user-1");
  assert.equal(rejected.nextCalls, 0);
  assert.equal(rejected.statusCode, 429);
  assert.equal(rejected.headers.get("retry-after"), "60");
  assert.deepEqual(rejected.body, {
    error: "Too many messages. Please wait before sending again.",
  });
  assert.equal(invokeLimiter(limiter, "user-2").nextCalls, 1);

  now += 60_000;
  assert.equal(invokeLimiter(limiter, "user-1").nextCalls, 1);
});

test("the user-chat limiter has no timer-driven cleanup", () => {
  const source = readFileSync(
    join(process.cwd(), "src", "modules", "chat", "presentation", "user-chat-send-rate-limit.ts"),
    "utf8",
  );
  assert.doesNotMatch(source, /setInterval\s*\(/);
});

test("uses a sliding one-minute window across fixed-window boundaries", () => {
  let now = 1_000_000;
  const limiter = createUserChatSendRateLimit(() => now);
  for (let count = 0; count < 30; count += 1) assert.equal(invokeLimiter(limiter, "user-1").nextCalls, 1);
  now += 59_999;
  assert.equal(invokeLimiter(limiter, "user-1").nextCalls, 0);
  now += 1;
  assert.equal(invokeLimiter(limiter, "user-1").nextCalls, 1);
});
