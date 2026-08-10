import assert from "node:assert/strict";
import { test } from "node:test";
import { GetInspectionStatistics } from "../../../src/modules/analytics/application/GetInspectionStatistics";

test("GetInspectionStatistics aggregates grouped repository rows", async () => {
  const calls: Array<{ userId: string; includeAll: boolean }> = [];
  const useCase = new GetInspectionStatistics({
    getLandingPageStats: async () => ({ inspectionCount: 0, userCount: 0, freshRate: 0 }),
    getClassificationStats: async (userId, includeAll) => {
      calls.push({ userId, includeAll });
      return [
        { classification: "fresh", total: 3 },
        { classification: "spoiled", total: 2 },
      ];
    },
  });

  assert.deepEqual(await useCase.execute({ userId: "user-1", includeAll: false }), {
    total: 5,
    byClassification: { fresh: 3, spoiled: 2 },
  });
  assert.deepEqual(calls, [{ userId: "user-1", includeAll: false }]);
});
