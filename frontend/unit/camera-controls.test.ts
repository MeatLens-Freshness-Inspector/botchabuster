import assert from "node:assert/strict";
import test from "node:test";

import {
  clampToRange,
  formatControlValue,
  normalizeSettingNumber,
  parseCameraControlRange,
} from "../src/components/camera/controls";

test("parseCameraControlRange reads valid ranges and falls back to a default step", () => {
  assert.deepEqual(parseCameraControlRange({ min: 1, max: 5, step: 0.5 }), {
    min: 1,
    max: 5,
    step: 0.5,
  });

  assert.deepEqual(parseCameraControlRange({ min: 2, max: 4 }), {
    min: 2,
    max: 4,
    step: 0.1,
  });
});

test("parseCameraControlRange rejects invalid ranges", () => {
  assert.equal(parseCameraControlRange(null), null);
  assert.equal(parseCameraControlRange({ min: "1", max: 5 }), null);
  assert.equal(parseCameraControlRange({ min: 5, max: 5, step: 1 }), null);
  assert.equal(parseCameraControlRange({ min: 10, max: 1, step: 1 }), null);
});

test("normalizeSettingNumber clamps values and falls back to the range minimum", () => {
  const range = { min: 0, max: 10, step: 0.5 };

  assert.equal(normalizeSettingNumber(12, range), 10);
  assert.equal(normalizeSettingNumber(-2, range), 0);
  assert.equal(normalizeSettingNumber(Number.NaN, range), 0);
  assert.equal(normalizeSettingNumber(undefined, range), 0);
  assert.equal(normalizeSettingNumber(3.5, null), 3.5);
  assert.equal(normalizeSettingNumber(undefined, null), null);
});

test("clampToRange and formatControlValue keep slider values display-safe", () => {
  const range = { min: 1, max: 3, step: 0.1 };

  assert.equal(clampToRange(0.5, range), 1);
  assert.equal(clampToRange(4, range), 3);
  assert.equal(formatControlValue(null), "--");
  assert.equal(formatControlValue(2), "2");
  assert.equal(formatControlValue(2.25), "2.3");
});
