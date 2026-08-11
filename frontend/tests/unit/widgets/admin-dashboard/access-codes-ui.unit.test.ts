import assert from "node:assert/strict";
import test from "node:test";
import { AccessCodesTab, MobileAccessCodesTab } from "@/widgets/admin-dashboard";

test("admin dashboard publishes access-code widget ownership", () => {
  assert.equal(typeof AccessCodesTab, "function");
  assert.equal(typeof MobileAccessCodesTab, "function");
});
