import assert from "node:assert/strict";
import test from "node:test";
import { getPendingAuditLogs, queueAuditLog } from "../../../../src/features/offline-sync";

test("offline sync exposes the audit queue through its feature public API", () => {
  assert.equal(typeof queueAuditLog, "function");
  assert.equal(typeof getPendingAuditLogs, "function");
});
