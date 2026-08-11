import assert from "node:assert/strict";
import test from "node:test";
import { useAccessCodeForm, useAccessCodes } from "@/features/admin-management";

test("admin management publishes access-code state hooks", () => {
  assert.equal(typeof useAccessCodeForm, "function");
  assert.equal(typeof useAccessCodes, "function");
});
