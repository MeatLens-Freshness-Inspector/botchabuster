import assert from "node:assert/strict";
import { test } from "node:test";
import { GetModelCalibrationAnalytics } from "../../../src/modules/model-accuracy/application/GetModelCalibrationAnalytics";
import type { ModelAccuracyRepository } from "../../../src/modules/model-accuracy/domain/ports/ModelAccuracyRepository";

const prediction = {
  sampleId: "sample-1",
  groundTruth: "fresh",
  predictedClass: "fresh",
  confidence: 0.8,
  probabilities: { fresh: 0.8, spoiled: 0.2 },
  modelVersionKey: "model-a",
};

function repository() {
  const queries: unknown[] = [];
  const fake = {
    registerModelVersion: async () => { throw new Error("unused"); },
    getHistory: async () => [],
    captureSnapshots: async () => [],
    importCalibrationPackage: async () => { throw new Error("unused"); },
    getCalibrationInputs: async (query: unknown) => {
      queries.push(query);
      return {
        predictions: [prediction, { ...prediction, sampleId: "sample-2", groundTruth: "spoiled", predictedClass: "spoiled", confidence: 0.9, probabilities: { fresh: 0.1, spoiled: 0.9 } }],
        fieldObservations: [],
        availableClasses: ["fresh", "spoiled"],
        availableModelVersions: [{ versionKey: "model-a", displayName: "Primary" }],
      };
    },
  } satisfies ModelAccuracyRepository;
  return { fake, queries };
}

test("analytics service returns controlled sample count, metrics, bins, class breakdown, and field monitoring", async () => {
  const { fake, queries } = repository();
  const response = await new GetModelCalibrationAnalytics(fake).execute({});
  assert.equal(response.controlled.sampleCount, 2);
  assert.equal(response.controlled.ece, 0.15);
  assert.equal(response.controlled.brierScore, 0.05);
  assert.equal(response.controlled.reliabilityBins.length, 10);
  assert.equal(response.controlled.confidenceDistribution[8].sampleCount, 1);
  assert.deepEqual(response.controlled.perClass.map((item) => item.className), ["fresh", "spoiled"]);
  assert.deepEqual(queries, [{ modelVersionKey: null, className: null }]);
});

test("analytics service recomputes one-vs-rest metrics for a selected class and forwards model filters", async () => {
  const { fake, queries } = repository();
  const response = await new GetModelCalibrationAnalytics(fake).execute({ modelVersionKey: "model-a", className: "fresh" });
  assert.equal(response.filters.modelVersionKey, "model-a");
  assert.equal(response.filters.className, "fresh");
  assert.equal(response.controlled.brierScore, 0.025);
  assert.equal(response.controlled.perClass.length, 1);
  assert.deepEqual(queries, [{ modelVersionKey: "model-a", className: "fresh" }]);
});

test("analytics service returns null metrics with bins when no labeled samples exist", async () => {
  const { fake } = repository();
  fake.getCalibrationInputs = async () => ({
    predictions: [],
    fieldObservations: [],
    availableClasses: [],
    availableModelVersions: [],
  });
  const response = await new GetModelCalibrationAnalytics(fake).execute({});
  assert.equal(response.controlled.sampleCount, 0);
  assert.equal(response.controlled.ece, null);
  assert.equal(response.controlled.brierScore, null);
  assert.equal(response.controlled.reliabilityBins.length, 10);
});

test("analytics service rejects filters that are not present in persisted metadata", async () => {
  const { fake } = repository();
  await assert.rejects(() => new GetModelCalibrationAnalytics(fake).execute({ className: "unknown" }), /unknown.*class/i);
  await assert.rejects(() => new GetModelCalibrationAnalytics(fake).execute({ modelVersionKey: "unknown" }), /unknown.*model/i);
});
