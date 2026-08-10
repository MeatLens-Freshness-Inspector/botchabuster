import assert from "node:assert/strict";
import "../../setup/env";
import { test } from "node:test";
import { AuditLogService } from "../../../src/modules/audit/infrastructure/AuditLogService";

test("module AuditLogService exposes the encrypted audit persistence component", () => {
  assert.equal(typeof AuditLogService.getInstance, "function");
});
