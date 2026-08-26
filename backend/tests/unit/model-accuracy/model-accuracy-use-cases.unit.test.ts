import assert from "node:assert/strict";
import { test } from "node:test";
import { GetModelAccuracyHistory } from "../../../src/modules/model-accuracy/application/GetModelAccuracyHistory";

test("history use case rejects a reversed date range before querying", async () => {
  const historyCalls: unknown[] = [];
  const query = new GetModelAccuracyHistory({
    getHistory: async (input) => { historyCalls.push(input); return []; },
    registerModelVersion: async () => { throw new Error("not used"); },
    captureSnapshots: async () => [],
  });

  await assert.rejects(
    query.execute({ startDate: "2026-08-27", endDate: "2026-08-26" }),
    /startDate must be on or before endDate/i,
  );
  assert.equal(historyCalls.length, 0);
});

test("history use case rejects ranges longer than one year", async () => {
  const query = new GetModelAccuracyHistory({
    getHistory: async () => [],
    registerModelVersion: async () => { throw new Error("not used"); },
    captureSnapshots: async () => [],
  });

  await assert.rejects(
    query.execute({ startDate: "2025-01-01", endDate: "2026-08-26" }),
    /date range cannot exceed 366 days/i,
  );
});
