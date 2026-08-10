import assert from "node:assert/strict";
import { test } from "node:test";
import { InspectionServiceGateway } from "../../../src/modules/inspections/infrastructure/InspectionServiceGateway";

test("InspectionServiceGateway maps module scope to the legacy service", async () => {
  let request: unknown;
  const gateway = new InspectionServiceGateway({
    getById: async (id, userId, scope, isAdmin) => {
      request = { id, userId, scope, isAdmin };
      return { id, user_id: userId, classification: "fresh" };
    },
  });

  assert.deepEqual(await gateway.getById({
    inspectionId: "inspection-1",
    userId: "user-1",
    includeAll: true,
  }), {
    id: "inspection-1",
    user_id: "user-1",
    classification: "fresh",
  });
  assert.deepEqual(request, {
    id: "inspection-1",
    userId: "user-1",
    scope: "all",
    isAdmin: true,
  });
});
