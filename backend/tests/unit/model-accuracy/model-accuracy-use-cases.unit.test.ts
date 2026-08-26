import assert from "node:assert/strict";
import { test } from "node:test";
import { GetModelAccuracyHistory } from "../../../src/modules/model-accuracy/application/GetModelAccuracyHistory";
import { RegisterModelVersion } from "../../../src/modules/model-accuracy/application/RegisterModelVersion";

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

test("history use case exposes malformed dates as validation errors", async () => {
  const query = new GetModelAccuracyHistory({
    getHistory: async () => [],
    registerModelVersion: async () => { throw new Error("not used"); },
    captureSnapshots: async () => [],
  });

  await assert.rejects(
    query.execute({ startDate: "2026-02-30", endDate: "2026-03-01" }),
    (error: unknown) => error instanceof Error && "statusCode" in error && error.statusCode === 400,
  );
});

test("model version registration exposes malformed request values as validation errors", async () => {
  const register = new RegisterModelVersion({
    registerModelVersion: async () => { throw new Error("not used"); },
  });

  assert.throws(
    () => register.execute({
        versionKey: 42 as unknown as string,
        displayName: "Version 1",
        expectedAccuracy: 0.9,
        activeFrom: "2026-08-26T00:00:00.000Z",
        createdBy: "user-1",
      }),
    (error: unknown) => error instanceof Error && "statusCode" in error && error.statusCode === 400,
  );
});
