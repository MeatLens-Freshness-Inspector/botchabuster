import assert from "node:assert/strict";
import test from "node:test";
import {
  useDeleteInspection,
  useInspection,
  useInspectionStats,
  useInspections,
} from "../../../../src/features/inspection-history";

test("inspection history publishes its query hooks through the feature API", () => {
  assert.equal(typeof useDeleteInspection, "function");
  assert.equal(typeof useInspection, "function");
  assert.equal(typeof useInspectionStats, "function");
  assert.equal(typeof useInspections, "function");
});
