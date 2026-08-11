import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyRecommendation,
  computeFreshnessScore,
} from "../../../../src/features/offline-analysis/lib/freshness-score";

test("freshness scoring retains the established class curves", () => {
  assert.equal(computeFreshnessScore("fresh", 0.8), 94);
  assert.equal(computeFreshnessScore("not fresh", 0.5), 50);
  assert.equal(computeFreshnessScore("spoiled", 1), 0);
});

test("freshness recommendations retain existing score thresholds", () => {
  assert.equal(classifyRecommendation(75), "Good for Consumption");
  assert.equal(classifyRecommendation(69), "Consume Immediately");
  assert.equal(classifyRecommendation(39), "Not Suitable");
});
