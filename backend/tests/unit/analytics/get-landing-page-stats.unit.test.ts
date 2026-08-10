import assert from "node:assert/strict";
import { test } from "node:test";
import { GetLandingPageStats } from "../../../src/modules/analytics/application/GetLandingPageStats";

test("GetLandingPageStats delegates to the analytics repository", async () => {
  const expected = { inspectionCount: 12, userCount: 4, freshRate: 75 };
  const useCase = new GetLandingPageStats({
    getLandingPageStats: async () => expected,
    getClassificationStats: async () => [],
  });

  assert.deepEqual(await useCase.execute(), expected);
});
