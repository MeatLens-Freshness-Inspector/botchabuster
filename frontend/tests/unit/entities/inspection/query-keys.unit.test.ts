import assert from "node:assert/strict";
import test from "node:test";
import {
  inspectionKeys,
  inspectionStatsKey,
} from "../../../../src/entities/inspection/model/queries";

test("inspection query keys keep user scoping and cache namespaces stable", () => {
  assert.deepEqual(inspectionKeys.list("user-1", 50), ["inspections", "user-1", 50]);
  assert.deepEqual(inspectionKeys.detail("user-1", "inspection-1"), [
    "inspection",
    "user-1",
    "inspection-1",
  ]);
  assert.deepEqual(inspectionStatsKey("user-1"), ["inspection-stats", "user-1"]);
});
