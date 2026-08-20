import assert from "node:assert/strict";
import { test } from "node:test";
import "../../setup/env";
import type { UserChatMessage } from "../../../src/modules/chat/infrastructure/UserChatService";
import { SupabaseChatRealtimeSource } from "../../../src/modules/chat/infrastructure/SupabaseChatRealtimeSource";

type StatusCallback = (status: string, error?: Error) => void;

class FakeChannel {
  eventType: string | null = null;
  filter: Record<string, string> | null = null;
  insertCallback: ((payload: { new?: unknown }) => void) | null = null;
  statusCallback: StatusCallback | null = null;

  on(
    eventType: string,
    filter: Record<string, string>,
    callback: (payload: { new?: unknown }) => void,
  ): this {
    this.eventType = eventType;
    this.filter = filter;
    this.insertCallback = callback;
    return this;
  }

  subscribe(callback: StatusCallback): this {
    this.statusCallback = callback;
    return this;
  }
}

test("subscribes to message inserts, validates rows, and removes its channel idempotently", async () => {
  const channel = new FakeChannel();
  const channelNames: string[] = [];
  let removeCalls = 0;
  const client = {
    channel(name: string) {
      channelNames.push(name);
      return channel;
    },
    async removeChannel(removedChannel: FakeChannel) {
      assert.equal(removedChannel, channel);
      removeCalls += 1;
    },
  };
  const received: UserChatMessage[] = [];
  const disconnects: Error[] = [];
  const source = new SupabaseChatRealtimeSource(client);
  const startPromise = source.start(
    (message) => received.push(message),
    (error) => disconnects.push(error),
  );

  assert.deepEqual(channelNames, ["user-chat-inserts"]);
  assert.equal(channel.eventType, "postgres_changes");
  assert.deepEqual(channel.filter, {
    event: "INSERT",
    schema: "public",
    table: "user_chat_messages",
  });

  channel.statusCallback?.("SUBSCRIBED");
  const stop = await startPromise;
  const message: UserChatMessage = {
    id: "message-1",
    sender_id: "sender-1",
    recipient_id: "recipient-1",
    content: "Hello",
    created_at: "2026-08-20T12:00:00.000Z",
  };
  channel.insertCallback?.({ new: message });
  channel.insertCallback?.({ new: { ...message, content: 42 } });

  assert.deepEqual(received, [message]);
  assert.deepEqual(disconnects, []);
  await stop();
  await stop();
  assert.equal(removeCalls, 1);
});

test("rejects an initial channel failure and reports a later disconnect", async () => {
  const firstChannel = new FakeChannel();
  const secondChannel = new FakeChannel();
  const channels = [firstChannel, secondChannel];
  const source = new SupabaseChatRealtimeSource({
    channel() {
      return channels.shift()!;
    },
    async removeChannel() {},
  });

  const failedStart = source.start(() => {}, () => {});
  firstChannel.statusCallback?.("TIMED_OUT");
  await assert.rejects(failedStart, /TIMED_OUT/);

  const disconnects: Error[] = [];
  const connectedStart = source.start(() => {}, (error) => disconnects.push(error));
  secondChannel.statusCallback?.("SUBSCRIBED");
  const stop = await connectedStart;
  secondChannel.statusCallback?.("CHANNEL_ERROR", new Error("socket lost"));

  assert.match(disconnects[0].message, /socket lost/);
  await stop();
});
