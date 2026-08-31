import assert from "node:assert/strict";
import test from "node:test";

import {
  getMeatTypeScope,
  getMeatTypeScopeLabel,
  isValidatedMeatType,
} from "../../../../src/entities/inspection";

test("pork is the only currently validated meat type", () => {
  assert.equal(getMeatTypeScope("pork"), "validated");
  assert.equal(isValidatedMeatType("pork"), true);
  assert.equal(getMeatTypeScopeLabel("pork"), null);
});

test("non-pork and unknown meat types remain available as future scope", () => {
  for (const meatType of ["beef", "chicken", "fish", "other", "unknown"]) {
    assert.equal(getMeatTypeScope(meatType), "future");
    assert.equal(isValidatedMeatType(meatType), false);
    assert.equal(getMeatTypeScopeLabel(meatType), "Future validation / research use");
  }
});
