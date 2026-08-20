import assert from "node:assert/strict";
import { test } from "node:test";
import type { UserChatMessage } from "../../../src/modules/chat/infrastructure/UserChatService";
import {
  CHAT_RETRY_DELAYS_MS,
  ChatConnectionLimitError,
  ChatRealtimeHub,
  type ChatRealtimeSource,
  type ChatStreamClient,
} from "../../../src/modules/chat/infrastructure/ChatRealtimeHub";

class FakeRealtimeSource implements ChatRealtimeSource {
  starts = 0;
  stops = 0;
  private onInsert: ((message: UserChatMessage) => void) | null = null;

  async start(
    onInsert: (message: UserChatMessage) => void,
    _onDisconnect: (error: Error) => void,
  ) {
    this.starts += 1;
    this.onInsert = onInsert;
    return async () => {
      this.stops += 1;
      this.onInsert = null;
    };
  }

  emit(message: UserChatMessage): void {
    this.onInsert?.(message);
  }
}

function createClient(id: string, userId: string) {
  const messages: UserChatMessage[] = [];
  const client: ChatStreamClient = {
    id,
    userId,
    createdAt: Date.now(),
    send(event, data) {
      if (event === "message") messages.push(data as UserChatMessage);
      return true;
    },
    close() {},
  };
  return { client, messages };
}

test("multiple clients share one source and receive only participant messages", async () => {
  const source = new FakeRealtimeSource();
  const hub = new ChatRealtimeHub(source);
  const sender = createClient("sender-stream", "sender-1");
  const recipient = createClient("recipient-stream", "recipient-1");
  const unrelated = createClient("unrelated-stream", "unrelated-1");

  const [disconnectSender, disconnectRecipient, disconnectUnrelated] = await Promise.all([
    hub.connect(sender.client),
    hub.connect(recipient.client),
    hub.connect(unrelated.client),
  ]);
  const message: UserChatMessage = {
    id: "message-1",
    sender_id: "sender-1",
    recipient_id: "recipient-1",
    content: "Realtime, without polling.",
    created_at: "2026-08-20T12:00:00.000Z",
  };

  source.emit(message);

  assert.equal(source.starts, 1);
  assert.deepEqual(sender.messages, [message]);
  assert.deepEqual(recipient.messages, [message]);
  assert.deepEqual(unrelated.messages, []);

  await disconnectSender();
  await disconnectRecipient();
  assert.equal(source.stops, 0);
  await disconnectUnrelated();
  assert.equal(source.stops, 1);
});

test("shutdown closes clients and stops the shared source exactly once", async () => {
  const source = new FakeRealtimeSource();
  const closed: string[] = [];
  const hub = new ChatRealtimeHub(source);
  const first = createClient("first", "user-1").client;
  const second = createClient("second", "user-2").client;
  first.close = (reason) => closed.push(`first:${reason}`);
  second.close = (reason) => closed.push(`second:${reason}`);

  await hub.connect(first);
  await hub.connect(second);
  await hub.shutdown();
  await hub.shutdown();

  assert.deepEqual(closed, ["first:server_shutdown", "second:server_shutdown"]);
  assert.equal(source.stops, 1);
});

test("evicts the oldest stream for a user while enforcing the total stream cap", async () => {
  const source = new FakeRealtimeSource();
  const closed: string[] = [];
  const hub = new ChatRealtimeHub(source, { maxClients: 2, maxClientsPerUser: 2 });
  const oldest = createClient("oldest", "user-1").client;
  const newer = createClient("newer", "user-1").client;
  const newest = createClient("newest", "user-1").client;
  oldest.createdAt = 1;
  newer.createdAt = 2;
  newest.createdAt = 3;
  oldest.close = (reason) => closed.push(reason);

  await hub.connect(oldest);
  await hub.connect(newer);
  await hub.connect(newest);

  assert.deepEqual(closed, ["replaced_by_newer_stream"]);
  assert.throws(
    () => hub.connect(createClient("other", "user-2").client),
    (error: unknown) => error instanceof ChatConnectionLimitError && error.scope === "instance",
  );
});

test("upstream recovery uses the five bounded delays and then reports unavailable", async () => {
  const scheduled: Array<{ delay: number; callback: () => void }> = [];
  const statuses: unknown[] = [];
  const source: ChatRealtimeSource = {
    async start() {
      throw new Error("upstream unavailable");
    },
  };
  const hub = new ChatRealtimeHub(source, {
    schedule(callback, delay) {
      scheduled.push({ callback, delay });
      return callback;
    },
    cancelSchedule() {},
  });
  const client = createClient("stream-1", "user-1").client;
  client.send = (event, data) => {
    if (event === "status") statuses.push(data);
    return true;
  };

  await hub.connect(client);
  await new Promise<void>((resolve) => setImmediate(resolve));
  for (let index = 0; index < CHAT_RETRY_DELAYS_MS.length; index += 1) {
    assert.equal(scheduled[index].delay, CHAT_RETRY_DELAYS_MS[index]);
    scheduled[index].callback();
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  assert.deepEqual(scheduled.map(({ delay }) => delay), [...CHAT_RETRY_DELAYS_MS]);
  assert.deepEqual(statuses.at(-1), { state: "realtime_unavailable" });
});
