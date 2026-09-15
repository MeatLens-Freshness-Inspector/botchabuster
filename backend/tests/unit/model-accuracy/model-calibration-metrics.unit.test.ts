import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildClassCalibration,
  buildConfidenceDistribution,
  buildReliabilityBins,
  calculateBrierScore,
  calculateEce,
  getConfidenceBin,
  type CalibrationPrediction,
} from "../../../src/modules/model-accuracy/domain/modelCalibration";

const rows: CalibrationPrediction[] = [
  {
    sampleId: "one",
    groundTruth: "fresh",
    predictedClass: "fresh",
    confidence: 0.8,
    probabilities: { fresh: 0.8, "not fresh": 0.15, spoiled: 0.05 },
  },
  {
    sampleId: "two",
    groundTruth: "fresh",
    predictedClass: "spoiled",
    confidence: 0.9,
    probabilities: { fresh: 0.1, "not fresh": 0, spoiled: 0.9 },
  },
];

test("confidence binning uses left-inclusive ranges and includes one in the last bin", () => {
  assert.equal(getConfidenceBin(0), 0);
  assert.equal(getConfidenceBin(0.8), 8);
  assert.equal(getConfidenceBin(0.9), 9);
  assert.equal(getConfidenceBin(1), 9);
});

test("reliability bins expose ten bins and null values for empty bins", () => {
  const bins = buildReliabilityBins(rows);
  assert.equal(bins.length, 10);
  assert.deepEqual(bins[0], {
    binIndex: 0,
    lowerBound: 0,
    upperBound: 0.1,
    sampleCount: 0,
    meanConfidence: null,
    observedAccuracy: null,
  });
  assert.equal(bins[8].sampleCount, 1);
  assert.equal(bins[8].meanConfidence, 0.8);
  assert.equal(bins[8].observedAccuracy, 1);
});

test("ECE is the sample-weighted confidence and accuracy gap", () => {
  assert.equal(calculateEce(rows), 0.55);
});

test("Brier score supports multiclass and selected-class binary calculations", () => {
  assert.equal(calculateBrierScore(rows), 0.8425);
  assert.equal(calculateBrierScore(rows, "fresh"), 0.425);
});

test("class calibration uses class probability and one-vs-rest membership", () => {
  const calibration = buildClassCalibration(rows, "fresh");
  assert.equal(calibration.className, "fresh");
  assert.equal(calibration.sampleCount, 2);
  assert.equal(calibration.reliabilityBins[8].sampleCount, 1);
  assert.equal(calibration.reliabilityBins[1].sampleCount, 1);
});

test("confidence distribution preserves empty bins and selected-class probabilities", () => {
  const all = buildConfidenceDistribution(rows);
  const fresh = buildConfidenceDistribution(rows, "fresh");
  assert.equal(all.length, 10);
  assert.equal(all[8].sampleCount, 1);
  assert.equal(all[9].sampleCount, 1);
  assert.equal(fresh[1].sampleCount, 1);
  assert.equal(fresh[8].sampleCount, 1);
});

test("empty calibration data has no metric and still returns chart bins", () => {
  assert.equal(calculateEce([]), null);
  assert.equal(calculateBrierScore([]), null);
  assert.equal(buildReliabilityBins([]).every((bin) => bin.sampleCount === 0 && bin.meanConfidence === null), true);
});
