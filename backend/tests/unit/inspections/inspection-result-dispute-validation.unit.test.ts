import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertDisputeSubmission,
  isInspectionResultDisputeStatus,
} from "../../../src/types/inspectionResultDispute";

test("dispute submission trims and accepts a supported classification", () => {
  assert.deepEqual(
    assertDisputeSubmission({
      expectedClassification: "  spoiled ",
      reason: "The sample has a strong sour odor and visible discoloration.",
    }),
    {
      expectedClassification: "spoiled",
      reason: "The sample has a strong sour odor and visible discoloration.",
    },
  );
});

test("dispute submission rejects a reason shorter than ten characters", () => {
  assert.throws(
    () => assertDisputeSubmission({ expectedClassification: "fresh", reason: "Too short" }),
    /reason must be between 10 and 2000 characters/,
  );
});

test("dispute submission rejects a reason longer than two thousand characters", () => {
  assert.throws(
    () => assertDisputeSubmission({ expectedClassification: "fresh", reason: "x".repeat(2_001) }),
    /reason must be between 10 and 2000 characters/,
  );
});

test("dispute submission rejects unsupported classifications", () => {
  assert.throws(
    () => assertDisputeSubmission({ expectedClassification: "raw", reason: "The expected state is different." }),
    /expectedClassification is invalid/,
  );
});

test("dispute status validation accepts only the persisted workflow states", () => {
  assert.equal(isInspectionResultDisputeStatus("pending"), true);
  assert.equal(isInspectionResultDisputeStatus("approved"), true);
  assert.equal(isInspectionResultDisputeStatus("rejected"), true);
  assert.equal(isInspectionResultDisputeStatus("developer_applied"), false);
});
