import assert from "node:assert/strict";
import test from "node:test";
import { useUserActions, useUsersTab } from "@/widgets/admin-dashboard";

test("admin dashboard publishes bounded user state hooks", () => {
  assert.equal(typeof useUsersTab, "function");
  assert.equal(typeof useUserActions, "function");
});
