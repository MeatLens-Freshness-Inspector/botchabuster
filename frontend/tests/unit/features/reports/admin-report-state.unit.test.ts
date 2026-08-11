import assert from "node:assert/strict";
import test from "node:test";
import { useAdminReport, useReportsTab } from "@/features/reports";

test("reports publishes bounded admin report state hooks", () => {
  assert.equal(typeof useAdminReport, "function");
  assert.equal(typeof useReportsTab, "function");
});
