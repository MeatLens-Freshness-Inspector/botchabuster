import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request, Response } from "express";
import { GetProfileController } from "../../../src/modules/users/presentation/controllers/GetProfileController";

test("GetProfileController sends the profile returned by the use case", async () => {
  let responseBody: unknown;
  let nextError: unknown;
  const controller = new GetProfileController({
    execute: async (userId: string) => ({ id: userId, full_name: "Ada", email: "ada@example.com" }),
  });

  await controller.handle(
    { params: { id: "user-1" } } as unknown as Request,
    { json: (body: unknown) => { responseBody = body; } } as Response,
    (error: unknown) => { nextError = error; },
  );

  assert.equal(nextError, undefined);
  assert.deepEqual(responseBody, { id: "user-1", full_name: "Ada", email: "ada@example.com" });
});
