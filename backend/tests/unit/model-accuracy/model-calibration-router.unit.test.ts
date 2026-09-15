import assert from "node:assert/strict";
import { test } from "node:test";
import { createModelAccuracyRouter } from "../../../src/modules/model-accuracy/presentation/routes";

test("model accuracy router retains legacy routes and exposes protected calibration routes", () => {
  const router = createModelAccuracyRouter({
    register: async () => { throw new Error("not used"); },
    history: async () => [],
    capture: async () => [],
    analytics: async () => ({
      filters: { modelVersionKey: null, className: null },
      availableClasses: [],
      availableModelVersions: [],
      controlled: { sampleCount: 0, ece: null, brierScore: null, reliabilityBins: [], confidenceDistribution: [], perClass: [] },
      fieldMonitoring: { buckets: [], highConfidenceApprovedDisputes: [] },
    }),
    importCalibration: async () => ({
      id: "import-1",
      sourceHash: "a".repeat(64),
      modelVersionKey: null,
      sampleCount: 1,
      importedBy: "admin-1",
      importedAt: "2026-09-15T00:00:00.000Z",
    }),
  });
  const layers = (router as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> }).stack
    .filter((entry) => entry.route)
    .map((entry) => ({ path: entry.route?.path, methods: entry.route?.methods }));

  assert.deepEqual(layers.map((layer) => `${layer.methods?.get ? "GET" : "POST"} ${layer.path}`), [
    "GET /history",
    "POST /versions",
    "POST /snapshots",
    "GET /calibration",
    "POST /calibration/import",
  ]);
});
