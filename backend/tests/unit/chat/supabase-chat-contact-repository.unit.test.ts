import assert from "node:assert/strict";
import { test } from "node:test";
import { SupabaseChatContactRepository } from "../../../src/modules/chat/infrastructure/SupabaseChatContactRepository";

test("SupabaseChatContactRepository uses the bounded contacts RPC", async () => {
  const calls: Array<{ functionName: string; args?: Record<string, unknown> }> = [];
  const repository = new SupabaseChatContactRepository({
    rpc: async (functionName, args) => {
      calls.push({ functionName, args });
      return {
        data: [{
          id: "contact-1",
          full_name: "User One",
          email: "user@example.com",
          inspector_code: null,
          location: "Market A",
          role: "user",
          last_message_preview: "Hello",
          last_message_at: "2026-08-10T00:00:00.000Z",
        }],
        error: null,
      };
    },
  });

  assert.deepEqual(await repository.listContacts("actor-1"), [{
    id: "contact-1",
    full_name: "User One",
    email: "user@example.com",
    inspector_code: null,
    location: "Market A",
    role: "user",
    last_message_preview: "Hello",
    last_message_at: "2026-08-10T00:00:00.000Z",
  }]);
  assert.deepEqual(calls, [{ functionName: "get_user_chat_contacts", args: { _actor_id: "actor-1" } }]);
});
