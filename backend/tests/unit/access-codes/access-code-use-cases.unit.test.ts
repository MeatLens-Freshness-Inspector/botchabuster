import assert from "node:assert/strict";
import { test } from "node:test";
import { ListAccessCodes } from "../../../src/modules/access-codes/application/ListAccessCodes";
import { ValidateAccessCode } from "../../../src/modules/access-codes/application/ValidateAccessCode";
import { CreateAccessCode } from "../../../src/modules/access-codes/application/CreateAccessCode";
import { DeleteAccessCode } from "../../../src/modules/access-codes/application/DeleteAccessCode";
import { ToggleAccessCode } from "../../../src/modules/access-codes/application/ToggleAccessCode";

test("access-code use cases delegate through explicit ports", async () => {
  const calls: string[] = [];
  const code = { id: "1", code: "ABC", description: null, is_active: true, times_used: 0, created_at: "now" };
  const port = {
    getAll: async () => [code], validate: async (value: string) => value === "ABC",
    create: async () => code, delete: async () => undefined,
    toggleActive: async () => code,
  };
  assert.deepEqual(await new ListAccessCodes(port).execute(), [code]);
  assert.equal(await new ValidateAccessCode({ validate: async (value) => { calls.push(value); return true; } }).execute("ABC"), true);
  assert.equal((await new CreateAccessCode(port).execute({ code: "ABC" })).id, "1");
  await new DeleteAccessCode({ delete: async (id) => { calls.push(id); } }).execute("1");
  assert.equal((await new ToggleAccessCode(port).execute({ id: "1", isActive: false })).id, "1");
  assert.deepEqual(calls, ["ABC", "1"]);
});
