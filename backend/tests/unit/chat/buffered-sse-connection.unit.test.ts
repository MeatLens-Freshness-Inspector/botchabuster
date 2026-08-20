import assert from "node:assert/strict";
import { test } from "node:test";
import { BufferedSseConnection } from "../../../src/modules/chat/infrastructure/BufferedSseConnection";

class FakeWriter {
  readonly writes: string[] = [];
  ended = 0;
  acceptWrites = true;
  private drainListener: (() => void) | null = null;

  write(frame: string): boolean {
    this.writes.push(frame);
    return this.acceptWrites;
  }

  once(event: "drain", listener: () => void): void {
    assert.equal(event, "drain");
    this.drainListener = listener;
  }

  end(): void {
    this.ended += 1;
  }

  drain(): void {
    const listener = this.drainListener;
    this.drainListener = null;
    listener?.();
  }
}

test("queues later SSE frames while the response is backpressured and flushes on drain", () => {
  const writer = new FakeWriter();
  writer.acceptWrites = false;
  const connection = new BufferedSseConnection({
    id: "stream-1",
    userId: "user-1",
    createdAt: 1,
    writer,
  });

  assert.equal(connection.send("status", { state: "connected" }), true);
  assert.equal(connection.send("message", { id: "message-1" }), true);
  assert.equal(writer.writes.length, 1);

  writer.acceptWrites = true;
  writer.drain();

  assert.equal(writer.writes.length, 2);
  assert.match(writer.writes[1], /^event: message\ndata: {"id":"message-1"}\n\n$/);
  assert.equal(writer.ended, 0);
});

test("closes a stream when its bounded event queue overflows", () => {
  const writer = new FakeWriter();
  writer.acceptWrites = false;
  const reasons: string[] = [];
  const connection = new BufferedSseConnection({
    id: "stream-1",
    userId: "user-1",
    createdAt: 1,
    writer,
    maxQueuedEvents: 1,
    maxQueuedBytes: 10_000,
    onClose: (reason) => reasons.push(reason),
  });

  assert.equal(connection.send("message", { id: "one" }), true);
  assert.equal(connection.send("message", { id: "two" }), true);
  assert.equal(connection.send("message", { id: "three" }), false);

  assert.deepEqual(reasons, ["backpressure_overflow"]);
  assert.equal(writer.ended, 1);
});

test("closes a stream when its queued bytes exceed 256 KiB", () => {
  const writer = new FakeWriter();
  writer.acceptWrites = false;
  const connection = new BufferedSseConnection({
    id: "stream-1",
    userId: "user-1",
    createdAt: 1,
    writer,
    maxQueuedEvents: 100,
    maxQueuedBytes: 32,
  });

  connection.send("status", { state: "connected" });
  assert.equal(connection.send("message", { content: "this frame is longer than thirty-two bytes" }), false);
  assert.equal(writer.ended, 1);
});
