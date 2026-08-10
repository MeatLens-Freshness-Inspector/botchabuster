import assert from "node:assert/strict";
import { test } from "node:test";
import { SupabaseAnalyticsRepository } from "../../../src/modules/analytics/infrastructure/SupabaseAnalyticsRepository";

test("SupabaseAnalyticsRepository uses the landing aggregate RPC", async () => {
  const calls: Array<{ functionName: string; args?: Record<string, unknown> }> = [];
  const repository = new SupabaseAnalyticsRepository({
    rpc: async (functionName, args) => {
      calls.push({ functionName, args });
      return { data: { inspectionCount: 12, userCount: 4, freshRate: 75 }, error: null };
    },
  });

  assert.deepEqual(await repository.getLandingPageStats(), {
    inspectionCount: 12,
    userCount: 4,
    freshRate: 75,
  });
  assert.deepEqual(calls, [{ functionName: "get_landing_page_stats", args: undefined }]);
});

test("SupabaseAnalyticsRepository scopes classification stats by user", async () => {
  const calls: Array<{ functionName: string; args?: Record<string, unknown> }> = [];
  const repository = new SupabaseAnalyticsRepository({
    rpc: async (functionName, args) => {
      calls.push({ functionName, args });
      return { data: [{ classification: "fresh", total: 3 }], error: null };
    },
  });

  assert.deepEqual(await repository.getClassificationStats("user-1", false), [
    { classification: "fresh", total: 3 },
  ]);
  assert.deepEqual(calls, [{
    functionName: "get_inspection_classification_stats",
    args: { _user_id: "user-1", _include_all: false },
  }]);
});
