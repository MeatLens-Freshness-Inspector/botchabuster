import assert from "node:assert/strict";
import "../../setup/env";
import { test } from "node:test";
import {
  captureModelAccuracySnapshots,
  getPreviousUtcDate,
} from "../../../src/jobs/captureModelAccuracySnapshots";

test("scheduler captures the previous UTC calendar day", async () => {
  const calls: Array<{ functionName: string; args?: Record<string, unknown> }> = [];
  const client = {
    rpc: async (functionName: string, args?: Record<string, unknown>) => {
      calls.push({ functionName, args });
      return { data: [{ id: "snapshot-1" }], error: null };
    },
  };

  assert.equal(getPreviousUtcDate(new Date("2026-08-26T00:10:00.000Z")), "2026-08-25");
  const result = await captureModelAccuracySnapshots(client, new Date("2026-08-26T00:10:00.000Z"));

  assert.deepEqual(result, { snapshotDate: "2026-08-25", insertedCount: 1 });
  assert.deepEqual(calls, [{
    functionName: "capture_model_accuracy_snapshots",
    args: { p_snapshot_date: "2026-08-25" },
  }]);
});

test("scheduler surfaces RPC failures", async () => {
  const client = {
    rpc: async () => ({ data: null, error: { message: "database unavailable" } }),
  };

  await assert.rejects(
    captureModelAccuracySnapshots(client, new Date("2026-08-26T00:10:00.000Z")),
    /database unavailable/,
  );
});
