import assert from "node:assert/strict";
import test from "node:test";
import { useLogFilters, useLogsTab } from "@/widgets/admin-dashboard";

test("admin dashboard publishes bounded audit-log state hooks", () => {
  assert.equal(typeof useLogsTab, "function");
  assert.equal(typeof useLogFilters, "function");
});
