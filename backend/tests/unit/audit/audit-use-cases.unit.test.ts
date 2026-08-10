import assert from "node:assert/strict";
import { test } from "node:test";
import { ListAuditLogs } from "../../../src/modules/audit/application/ListAuditLogs";
import { WriteAuditLogBatch } from "../../../src/modules/audit/application/WriteAuditLogBatch";

test("audit use cases delegate list and batch writes", async () => {
  const event = { payload: { event_type: "test" } };
  const record = { id: "1", ...event, created_at: "now" } as never;
  assert.deepEqual(await new ListAuditLogs({ listRecent: async () => [record] }).execute(10), [record]);
  assert.equal(await new WriteAuditLogBatch({ writeBatch: async (events) => events.length }).execute([event]), 1);
});
