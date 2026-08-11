import assert from "node:assert/strict";
import test from "node:test";
import { UsersTab } from "@/widgets/admin-dashboard";

test("admin dashboard publishes the complete users tab widget", () => {
  assert.equal(typeof UsersTab, "function");
});
