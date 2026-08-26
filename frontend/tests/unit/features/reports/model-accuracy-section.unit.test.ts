import assert from "node:assert/strict";
import test from "node:test";
import { buildModelAccuracySection } from "../../../../src/features/reports/lib/model-accuracy-section";

const snapshot = {
  id: "snapshot-1",
  modelVersionId: "model-1",
  versionKey: "mobilenet-primary-2026-08-13",
  displayName: "Primary MobileNetV3",
  snapshotDate: "2026-08-25",
  expectedAccuracy: 0.92,
  observedAccuracy: 0.875,
  evaluatedCount: 16,
  correctCount: 14,
  createdAt: "2026-08-26T00:10:00.000Z",
};

test("historical accuracy section compares expected and observed accuracy", () => {
  const section = buildModelAccuracySection([snapshot]);

  assert.equal(section.id, "model-accuracy-history");
  assert.deepEqual(section.tables?.[0]?.columns, [
    "Date", "Model Version", "Expected", "Observed", "Evaluated", "Correct",
  ]);
  assert.equal(section.charts?.[0]?.series?.length, 2);
  assert.match(section.tables?.[0]?.rows[0]?.[3] ?? "", /87\.50%/);
  assert.deepEqual(section.charts?.[0]?.series?.map((series) => series.name), [
    "Expected Accuracy",
    "Observed Accuracy",
  ]);
});

test("historical accuracy section marks snapshots without official labels unavailable", () => {
  const section = buildModelAccuracySection([{
    ...snapshot,
    observedAccuracy: null,
    evaluatedCount: 0,
    correctCount: 0,
  }]);

  assert.equal(section.tables?.[0]?.rows[0]?.[3], "Unavailable");
  assert.match(section.charts?.[0]?.emptyState ?? "", /No finalized model accuracy snapshots/);
});

test("historical accuracy section retains an empty state", () => {
  const section = buildModelAccuracySection([]);

  assert.deepEqual(section.tables?.[0]?.rows, []);
  assert.match(section.narrative?.[0] ?? "", /No finalized model accuracy snapshots/);
});
