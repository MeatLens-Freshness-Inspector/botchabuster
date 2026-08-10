import assert from "node:assert/strict";
import { test } from "node:test";
import { UserId } from "../../../src/modules/users/domain/UserId";

test("UserId accepts canonical UUIDs", () => {
  const id = UserId.create("550e8400-e29b-41d4-a716-446655440000");

  assert.equal(id.value, "550e8400-e29b-41d4-a716-446655440000");
});

test("UserId rejects malformed identifiers", () => {
  assert.throws(() => UserId.create("not-a-user"), /valid UUID/i);
  assert.throws(() => UserId.create(""), /valid UUID/i);
});
