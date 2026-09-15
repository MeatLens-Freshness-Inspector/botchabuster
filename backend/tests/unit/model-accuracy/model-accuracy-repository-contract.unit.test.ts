import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  CalibrationRepositoryInputs,
  ImportCalibrationPackageInput,
} from "../../../src/modules/model-accuracy/domain/ports/ModelAccuracyRepository";
import type { ModelAccuracyRepository } from "../../../src/modules/model-accuracy/domain/ports/ModelAccuracyRepository";

test("model accuracy repository accepts immutable calibration imports and filtered analytics inputs", async () => {
  const calls: { import?: ImportCalibrationPackageInput; query?: unknown } = {};
  const repository: ModelAccuracyRepository = {
    registerModelVersion: async () => { throw new Error("unused"); },
    getHistory: async () => [],
    captureSnapshots: async () => [],
    importCalibrationPackage: async (input) => {
      calls.import = input;
      return {
        id: "import-1",
        sourceHash: input.sourceHash,
        modelVersionKey: input.modelVersionKey,
        sampleCount: input.predictions.length,
        importedBy: input.importedBy,
        importedAt: "2026-09-15T00:00:00.000Z",
      };
    },
    getCalibrationInputs: async (query) => {
      calls.query = query;
      return {
        predictions: [],
        fieldObservations: [],
        availableClasses: [],
        availableModelVersions: [],
      } satisfies CalibrationRepositoryInputs;
    },
  };

  await repository.importCalibrationPackage({
    sourceHash: "hash-1",
    modelVersionKey: "model-a",
    predictions: [],
    importedBy: "admin-1",
  });
  await repository.getCalibrationInputs({ modelVersionKey: "model-a", className: "fresh" });

  assert.equal(calls.import?.sourceHash, "hash-1");
  assert.equal(calls.import?.modelVersionKey, "model-a");
  assert.deepEqual(calls.query, { modelVersionKey: "model-a", className: "fresh" });
});
