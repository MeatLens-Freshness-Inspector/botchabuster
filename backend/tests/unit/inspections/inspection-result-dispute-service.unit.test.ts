import assert from "node:assert/strict";
import { test } from "node:test";

process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";

const dispute = {
  id: "dispute-1",
  inspection_id: "inspection-1",
  submitted_by: "inspector-1",
  expected_classification: "spoiled",
  reason: "The sample has visible discoloration and a sour odor.",
  status: "pending",
};

test("dispute creation verifies inspection ownership before inserting", async () => {
  const { inspectionResultDisputeService } = await import("../../../src/modules/inspections/infrastructure/InspectionResultDisputeService");
  const { supabase } = await import("../../../src/integrations/supabase");
  const client = supabase as any;
  const originalFrom = client.from;
  const calls: Array<{ table: string; column?: string; value?: unknown }> = [];

  client.from = ((table: string) => {
    if (table === "inspections") {
      const chain = {
        select: () => chain,
        eq: (column: string, value: unknown) => {
          calls.push({ table, column, value });
          return chain;
        },
        maybeSingle: async () => ({ data: { id: "inspection-1" }, error: null }),
      };
      return chain;
    }

    const chain = {
      insert: (payload: unknown) => {
        calls.push({ table, value: payload });
        return chain;
      },
      select: () => chain,
      single: async () => ({ data: dispute, error: null }),
    };
    return chain;
  }) as typeof supabase.from;

  try {
    const result = await inspectionResultDisputeService.create({
      inspectionId: "inspection-1",
      submittedBy: "inspector-1",
      expectedClassification: "spoiled",
      reason: "The sample has visible discoloration and a sour odor.",
    });

    assert.equal(result.id, "dispute-1");
    assert.deepEqual(calls.slice(0, 2), [
      { table: "inspections", column: "id", value: "inspection-1" },
      { table: "inspections", column: "user_id", value: "inspector-1" },
    ]);
    assert.deepEqual(calls[2], {
      table: "inspection_result_disputes",
      value: {
        inspection_id: "inspection-1",
        submitted_by: "inspector-1",
        expected_classification: "spoiled",
        reason: "The sample has visible discoloration and a sour odor.",
      },
    });
  } finally {
    client.from = originalFrom;
  }
});

test("dispute mutations call the transaction RPCs with actor identity", async () => {
  const { inspectionResultDisputeService } = await import("../../../src/modules/inspections/infrastructure/InspectionResultDisputeService");
  const { supabase } = await import("../../../src/integrations/supabase");
  const client = supabase as any;
  const originalRpc = client.rpc;
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const inspection = { id: "inspection-1", classification: "fresh" };

  client.rpc = async (name: string, args: Record<string, unknown>) => {
    calls.push({ name, args });
    return {
      data: {
        dispute,
        inspection,
        previous_manual_classification: "fresh",
        previous_official_classification: null,
      },
      error: null,
    };
  };

  try {
    const developerResult = await inspectionResultDisputeService.applyToDeveloperDataset("dispute-1", "developer-1");
    const reviewResult = await inspectionResultDisputeService.review("dispute-1", "admin-1", "approved", "Confirmed.");

    assert.equal(developerResult.previousManualClassification, "fresh");
    assert.equal(reviewResult.previousOfficialClassification, null);
    assert.deepEqual(calls, [
      {
        name: "apply_inspection_dispute_to_developer_dataset",
        args: { p_dispute_id: "dispute-1", p_actor_id: "developer-1" },
      },
      {
        name: "review_inspection_result_dispute",
        args: {
          p_dispute_id: "dispute-1",
          p_actor_id: "admin-1",
          p_decision: "approved",
          p_reviewer_note: "Confirmed.",
        },
      },
    ]);
  } finally {
    client.rpc = originalRpc;
  }
});

test("inspection statistics count the official result when one has been approved", async () => {
  const { inspectionService } = await import("../../../src/modules/inspections/infrastructure/InspectionService");
  const { supabase } = await import("../../../src/integrations/supabase");
  const client = supabase as any;
  const originalFrom = client.from;

  client.from = ((table: string) => {
    assert.equal(table, "inspections");
    const chain = {
      select: () => chain,
      limit: () => chain,
      eq: () => chain,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({
        data: [
          { classification: "fresh", official_classification: "spoiled" },
          { classification: "fresh", official_classification: null },
        ],
        error: null,
      }).then(resolve),
    };
    return chain;
  }) as typeof supabase.from;

  try {
    assert.deepEqual(await inspectionService.getStatistics("user-1"), {
      total: 2,
      byClassification: { spoiled: 1, fresh: 1 },
    });
  } finally {
    client.from = originalFrom;
  }
});
