import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request, Response } from "express";
import { GetInspectionController } from "../../../src/modules/inspections/presentation/controllers/GetInspectionController";

test("GetInspectionController passes access scope to the inspection use case", async () => {
  let responseBody: unknown;
  let capturedInput: unknown;
  const controller = new GetInspectionController(
    {
      execute: async (input) => {
        capturedInput = input;
        return { id: "inspection-1", user_id: "user-1", classification: "fresh" };
      },
    },
    async () => ({ userId: "user-1", isAdmin: true }),
  );

  await controller.handle(
    { params: { id: "inspection-1" }, query: { scope: "all" } } as unknown as Request,
    { json: (body: unknown) => { responseBody = body; } } as Response,
    () => undefined,
  );

  assert.deepEqual(capturedInput, { inspectionId: "inspection-1", userId: "user-1", includeAll: true });
  assert.deepEqual(responseBody, { id: "inspection-1", user_id: "user-1", classification: "fresh" });
});
