import assert from "node:assert/strict";
import test from "node:test";
import type { InspectionResultDisputeRepository } from "../../../src/modules/inspections/domain/ports/InspectionResultDisputeRepository";

process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";
process.env.AUDIT_LOG_KEY = process.env.AUDIT_LOG_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

test("lists all dispute records through the repository boundary", async () => {
  const { ListAllInspectionResultDisputes } = await import("../../../src/modules/inspections");
  const records = [{ id: "dispute-1", status: "approved" }] as any;
  let called = false;
  const repository = {
    listAllForReview: async () => { called = true; return records; },
  } as Pick<InspectionResultDisputeRepository, "listAllForReview">;

  const result = await new ListAllInspectionResultDisputes(repository as InspectionResultDisputeRepository).execute();

  assert.equal(called, true);
  assert.equal(result, records);
});
