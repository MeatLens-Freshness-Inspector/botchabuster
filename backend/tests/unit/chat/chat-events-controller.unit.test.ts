import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import "../../setup/env";
import { RequestAuthError } from "../../../src/middleware/auth";
import { ChatEventsController } from "../../../src/modules/chat/presentation/controllers/ChatEventsController";

class FakeRequest extends EventEmitter {
  authAccessToken?: string;
  private readonly headers = new Map<string, string>();

  setHeader(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value);
  }

  header(name: string): string | undefined {
    return this.headers.get(name.toLowerCase());
  }
}

class FakeResponse extends EventEmitter {
  statusCode = 200;
  readonly headers = new Map<string, string>();
  readonly writes: string[] = [];
  jsonBody: unknown = null;
  flushes = 0;
  ends = 0;
  writableEnded = false;

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  set(values: Record<string, string>): this {
    for (const [name, value] of Object.entries(values)) this.headers.set(name.toLowerCase(), value);
    return this;
  }

  json(body: unknown): this {
    this.jsonBody = body;
    this.end();
    return this;
  }

  write(frame: string): boolean {
    this.writes.push(frame);
    return true;
  }

  flushHeaders(): void {
    this.flushes += 1;
  }

  end(): this {
    if (!this.writableEnded) {
      this.writableEnded = true;
      this.ends += 1;
    }
    return this;
  }
}

test("rejects disallowed origins and unauthenticated streams before SSE headers", async () => {
  let authCalls = 0;
  const controller = new ChatEventsController({
    hub: { connect: () => async () => {} },
    authenticate: async () => {
      authCalls += 1;
      throw new RequestAuthError(401, "Authentication required");
    },
    allowedOrigins: ["https://allowed.example"],
    idleTimeoutSeconds: 900,
  });
  const disallowedRequest = new FakeRequest();
  disallowedRequest.setHeader("origin", "https://evil.example");
  const disallowedResponse = new FakeResponse();

  await controller.handle(disallowedRequest as never, disallowedResponse as never);

  assert.equal(disallowedResponse.statusCode, 403);
  assert.equal(disallowedResponse.flushes, 0);
  assert.equal(authCalls, 0);

  const unauthenticatedRequest = new FakeRequest();
  unauthenticatedRequest.setHeader("origin", "https://allowed.example");
  const unauthenticatedResponse = new FakeResponse();
  await controller.handle(unauthenticatedRequest as never, unauthenticatedResponse as never);

  assert.equal(unauthenticatedResponse.statusCode, 401);
  assert.equal(unauthenticatedResponse.flushes, 0);
});

test("writes secure SSE headers, heartbeats, and rotates without repeated auth activity", async () => {
  const request = new FakeRequest();
  request.setHeader("origin", "https://allowed.example");
  const response = new FakeResponse();
  let authCalls = 0;
  let disconnects = 0;
  const intervals: Array<{ callback: () => void; delay: number }> = [];
  const timeouts: Array<{ callback: () => void; delay: number }> = [];
  const controller = new ChatEventsController({
    hub: {
      connect(client) {
        assert.equal(client.userId, "user-1");
        return async () => {
          disconnects += 1;
        };
      },
    },
    authenticate: async (req) => {
      authCalls += 1;
      req.authAccessToken = "app-session-token";
      return { userId: "user-1" };
    },
    allowedOrigins: ["https://allowed.example"],
    idleTimeoutSeconds: 900,
    nowMs: () => 1_000_000,
    getAbsoluteExpiryMs: () => 1_100_000,
    createConnectionId: () => "stream-1",
    setInterval(callback, delay) {
      intervals.push({ callback, delay });
      return callback;
    },
    clearInterval() {},
    setTimeout(callback, delay) {
      timeouts.push({ callback, delay });
      return callback;
    },
    clearTimeout() {},
  });

  await controller.handle(request as never, response as never);

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers.get("content-type"), "text/event-stream; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "no-store, no-transform");
  assert.equal(response.headers.get("connection"), "keep-alive");
  assert.equal(response.headers.get("x-accel-buffering"), "no");
  assert.equal(response.flushes, 1);
  assert.equal(intervals[0].delay, 25_000);
  assert.equal(timeouts[0].delay, 100_000);
  assert.match(response.writes[0], /"state":"connecting"/);

  intervals[0].callback();
  assert.equal(response.writes.at(-1), ": heartbeat\n\n");
  assert.equal(authCalls, 1);

  timeouts[0].callback();
  await new Promise<void>((resolve) => setImmediate(resolve));
  request.emit("close");
  assert.equal(disconnects, 1);
  assert.equal(response.ends, 1);
});

test("does not admit a request that closes while authentication is pending", async () => {
  const request = new FakeRequest();
  request.setHeader("origin", "https://allowed.example");
  const response = new FakeResponse();
  let resolveAuth!: (value: { userId: string }) => void;
  let connects = 0;
  const controller = new ChatEventsController({
    hub: { connect() { connects += 1; return async () => {}; } },
    authenticate: () => new Promise((resolve) => { resolveAuth = resolve; }),
    allowedOrigins: ["https://allowed.example"],
  });

  const pending = controller.handle(request as never, response as never);
  request.emit("close");
  resolveAuth({ userId: "user-1" });
  await pending;
  assert.equal(connects, 0);
  assert.equal(response.flushes, 0);
});
