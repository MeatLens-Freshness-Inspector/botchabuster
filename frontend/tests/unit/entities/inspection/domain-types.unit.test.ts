import assert from "node:assert/strict";
import test from "node:test";
import {
  FRESHNESS_CLASSIFICATIONS,
  MEAT_TYPES,
} from "../../../../src/entities/inspection";

test("inspection entity publishes stable domain vocabularies", () => {
  assert.deepEqual(FRESHNESS_CLASSIFICATIONS, ["fresh", "not fresh", "spoiled", "acceptable", "warning"]);
  assert.deepEqual(MEAT_TYPES, ["pork", "beef", "chicken", "fish", "other"]);
});
