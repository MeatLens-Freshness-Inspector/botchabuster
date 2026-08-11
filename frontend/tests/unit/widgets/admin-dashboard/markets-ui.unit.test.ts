import assert from "node:assert/strict";
import test from "node:test";
import { MarketsTab, MobileMarketsTab } from "@/widgets/admin-dashboard";

test("admin dashboard publishes market widget ownership", () => {
  assert.equal(typeof MarketsTab, "function");
  assert.equal(typeof MobileMarketsTab, "function");
});
