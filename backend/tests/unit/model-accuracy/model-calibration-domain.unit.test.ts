import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CALIBRATION_BIN_COUNT,
  HIGH_CONFIDENCE_THRESHOLD,
  assertValidCalibrationPrediction,
  type CalibrationPrediction,
} from "../../../src/modules/model-accuracy/domain/modelCalibration";

const validPrediction: CalibrationPrediction = {
  sampleId: "sample-1",
  groundTruth: "fresh",
  predictedClass: "fresh",
  confidence: 0.8,
  probabilities: { fresh: 0.8, "not fresh": 0.15, spoiled: 0.05 },
  modelVersionKey: "mobilenet-primary-2026-08-13",
};

test("calibration contracts expose the shared ten-bin and high-confidence conventions", () => {
  assert.equal(CALIBRATION_BIN_COUNT, 10);
  assert.equal(HIGH_CONFIDENCE_THRESHOLD, 0.8);
});

test("calibration prediction accepts labels, probabilities, and optional provenance", () => {
  assert.deepEqual(assertValidCalibrationPrediction(validPrediction), validPrediction);
  assert.deepEqual(
    assertValidCalibrationPrediction({
      ...validPrediction,
      modelVersionKey: null,
      probabilities: { fresh: 1 },
    }),
    { ...validPrediction, modelVersionKey: null, probabilities: { fresh: 1 } },
  );
});

test("calibration prediction rejects missing labels and invalid probabilities", () => {
  assert.throws(() => assertValidCalibrationPrediction({ ...validPrediction, sampleId: "" }), /sampleId/i);
  assert.throws(() => assertValidCalibrationPrediction({ ...validPrediction, groundTruth: "" }), /groundTruth/i);
  assert.throws(() => assertValidCalibrationPrediction({ ...validPrediction, predictedClass: "" }), /predictedClass/i);
  assert.throws(() => assertValidCalibrationPrediction({ ...validPrediction, confidence: -0.01 }), /confidence/i);
  assert.throws(() => assertValidCalibrationPrediction({ ...validPrediction, confidence: Number.NaN }), /confidence/i);
  assert.throws(
    () => assertValidCalibrationPrediction({ ...validPrediction, probabilities: { fresh: 1.1 } }),
    /probabilit/i,
  );
  assert.throws(
    () => assertValidCalibrationPrediction({ ...validPrediction, probabilities: {} }),
    /probabilit/i,
  );
});
