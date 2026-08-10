import assert from "node:assert/strict";
import { test } from "node:test";
import { GetInspectionById } from "../../../src/modules/inspections/application/GetInspectionById";

const inspection = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  user_id: "660e8400-e29b-41d4-a716-446655440000",
  classification: "fresh",
};

test("GetInspectionById validates IDs and scopes the repository request", async () => {
  let request: unknown;
  const useCase = new GetInspectionById({
    getById: async (input) => {
      request = input;
      return inspection;
    },
  });

  assert.deepEqual(await useCase.execute({
    inspectionId: inspection.id,
    userId: inspection.user_id,
    includeAll: false,
  }), inspection);
  assert.deepEqual(request, {
    inspectionId: inspection.id,
    userId: inspection.user_id,
    includeAll: false,
  });
});

test("GetInspectionById returns a not-found error when the repository has no row", async () => {
  const useCase = new GetInspectionById({ getById: async () => null });

  await assert.rejects(() => useCase.execute({
    inspectionId: inspection.id,
    userId: inspection.user_id,
    includeAll: false,
  }), /inspection not found/i);
});
