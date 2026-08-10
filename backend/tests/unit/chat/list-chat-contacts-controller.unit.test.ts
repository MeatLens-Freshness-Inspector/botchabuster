import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request, Response } from "express";
import { ListChatContactsController } from "../../../src/modules/chat/presentation/controllers/ListChatContactsController";

test("ListChatContactsController resolves the actor and renders contacts", async () => {
  let responseBody: unknown;
  const controller = new ListChatContactsController(
    {
      execute: async (actorId: string) => [{
        id: "contact-1",
        full_name: actorId,
        email: null,
        inspector_code: null,
        location: null,
        role: "admin",
        last_message_preview: null,
        last_message_at: null,
      }],
    },
    async () => ({ userId: "actor-1" }),
  );

  await controller.handle(
    {} as Request,
    { json: (body: unknown) => { responseBody = body; } } as Response,
    () => undefined,
  );

  assert.deepEqual(responseBody, [{
    id: "contact-1",
    full_name: "actor-1",
    email: null,
    inspector_code: null,
    location: null,
    role: "admin",
    last_message_preview: null,
    last_message_at: null,
  }]);
});
