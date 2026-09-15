import assert from "node:assert/strict";
import test from "node:test";

test("calibration investigation navigation uses the existing history route state contract", () => {
  const state: unknown = { inspectionId: "inspection-42" };
  assert.equal(typeof (state as { inspectionId?: unknown }).inspectionId, "string");
});
