import assert from "node:assert/strict";
import test from "node:test";
import { ListAllInspectionResultDisputes } from "../../../src/modules/inspections/application/ListAllInspectionResultDisputes";
import type { InspectionResultDisputeRepository } from "../../../src/modules/inspections/domain/ports/InspectionResultDisputeRepository";

test("lists all dispute records through the repository boundary", async () => {
  const records = [{ id: "dispute-1", status: "approved" }] as any;
  let called = false;
  const repository = {
    listAllForReview: async () => { called = true; return records; },
  } as Pick<InspectionResultDisputeRepository, "listAllForReview">;

  const result = await new ListAllInspectionResultDisputes(repository as InspectionResultDisputeRepository).execute();

  assert.equal(called, true);
  assert.equal(result, records);
});
