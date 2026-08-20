import assert from "node:assert/strict";
import { test } from "node:test";
import type { UserChatMessage } from "../../../src/modules/chat/infrastructure/UserChatService";
import {
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
