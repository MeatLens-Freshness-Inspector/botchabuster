import assert from "node:assert/strict";
import { test } from "node:test";
import { InspectionId } from "../../../src/modules/inspections/domain/InspectionId";

test("InspectionId accepts a UUID", () => {
  assert.equal(
    InspectionId.create("550e8400-e29b-41d4-a716-446655440000").value,
    "550e8400-e29b-41d4-a716-446655440000",
  );
});

test("InspectionId rejects malformed IDs", () => {
  assert.throws(() => InspectionId.create("inspection-1"), /valid UUID/i);
});
