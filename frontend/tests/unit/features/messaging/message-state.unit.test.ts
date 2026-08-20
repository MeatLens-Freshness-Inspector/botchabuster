import assert from "node:assert/strict";
import { test } from "node:test";
import type { UserChatContact, UserChatMessage } from "../../../../src/entities/message";
import {
  applyMessageToContacts,
  isConversationMessage,
  mergeContactSnapshots,
  upsertMessages,
} from "../../../../src/features/messaging/model/message-state";

const older: UserChatMessage = {
  id: "message-b",
  sender_id: "user-1",
  recipient_id: "admin-1",
  content: "Older",
  created_at: "2026-08-20T10:00:00.000Z",
};
const newer: UserChatMessage = {
  id: "message-c",
  sender_id: "admin-1",
  recipient_id: "user-1",
  content: "Newer",
  created_at: "2026-08-20T11:00:00.000Z",
};

function contact(id: string, lastMessageAt: string | null = null): UserChatContact {
  return {
    id,
    full_name: id,
    email: `${id}@example.com`,
    inspector_code: null,
    location: null,
    role: "admin",
    last_message_preview: lastMessageAt ? "Existing" : null,
    last_message_at: lastMessageAt,
  };
}

test("upserts messages by ID and sorts deterministically by creation time then ID", () => {
  const sameTime = { ...older, id: "message-a" };
  const result = upsertMessages([newer, older], [{ ...older, content: "Updated" }, sameTime]);

  assert.deepEqual(result.map(({ id }) => id), ["message-a", "message-b", "message-c"]);
  assert.equal(result.filter(({ id }) => id === "message-b").length, 1);
  assert.equal(result.find(({ id }) => id === "message-b")?.content, "Updated");
});

test("recognizes only the selected two-party conversation", () => {
  assert.equal(isConversationMessage(newer, "user-1", "admin-1"), true);
  assert.equal(isConversationMessage(newer, "user-2", "admin-1"), false);
  assert.equal(isConversationMessage(newer, "user-1", "admin-2"), false);
});

test("updates and reorders only the participant contact preview", () => {
  const result = applyMessageToContacts(
    [contact("admin-2", "2026-08-20T10:30:00.000Z"), contact("admin-1")],
    newer,
    "user-1",
  );

  assert.deepEqual(result.map(({ id }) => id), ["admin-1", "admin-2"]);
  assert.equal(result[0].last_message_preview, "Newer");
  assert.equal(result[0].last_message_at, newer.created_at);
  assert.deepEqual(applyMessageToContacts(result, newer, "unrelated-user"), result);
});

test("a stale contacts snapshot cannot overwrite a newer streamed preview", () => {
  const current = [{
    ...contact("admin-1", newer.created_at),
    last_message_preview: newer.content,
  }];
  const staleSnapshot = [{
    ...contact("admin-1", older.created_at),
    last_message_preview: older.content,
  }];

  assert.deepEqual(mergeContactSnapshots(current, staleSnapshot), current);
});
