import assert from "node:assert/strict";
import test from "node:test";

import {
  AuditLogClient,
  auditLogClient,
} from "../../../../src/entities/audit-log";

test("audit-log entity publishes its client singleton", () => {
  assert.equal(typeof AuditLogClient, "function");
  assert.equal(auditLogClient, AuditLogClient.getInstance());
});
