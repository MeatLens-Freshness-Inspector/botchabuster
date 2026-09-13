import assert from "node:assert/strict";
import test from "node:test";

process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";
process.env.AUDIT_LOG_KEY = process.env.AUDIT_LOG_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

test("dispute controller returns the complete review history", async () => {
  const { InspectionResultDisputeController } = await import("../../../src/modules/inspections/presentation/controllers/InspectionResultDisputeController");
  const { inspectionResultDisputeService } = await import("../../../src/modules/inspections/infrastructure/InspectionResultDisputeService");
  const records = [
    { id: "dispute-1", status: "approved" },
    { id: "dispute-2", status: "rejected" },
    { id: "dispute-3", status: "pending" },
  ];
  const originalListAllForReview = inspectionResultDisputeService.listAllForReview;
  let responseBody: unknown;

  inspectionResultDisputeService.listAllForReview = async () => records as any;
  try {
    await new InspectionResultDisputeController().listAllForReview({} as any, {
      json: (body: unknown) => { responseBody = body; },
    } as any);
  } finally {
    inspectionResultDisputeService.listAllForReview = originalListAllForReview;
  }

  assert.deepEqual(responseBody, records);
});
