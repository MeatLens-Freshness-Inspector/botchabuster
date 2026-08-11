import assert from "node:assert/strict";
import test from "node:test";
import { UserActions, UserTable } from "@/widgets/admin-dashboard";

test("admin dashboard publishes user widget ownership", () => {
  assert.equal(typeof UserTable, "function");
  assert.equal(typeof UserActions, "function");
});
