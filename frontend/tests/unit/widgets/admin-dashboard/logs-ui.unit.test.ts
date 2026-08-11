import assert from "node:assert/strict";
import test from "node:test";
import { DesktopLogsTab, LogsTab } from "@/widgets/admin-dashboard";

test("admin dashboard publishes audit-log widget ownership", () => {
  assert.equal(typeof LogsTab, "function");
  assert.equal(typeof DesktopLogsTab, "function");
});
