import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request, Response } from "express";
import { LandingPageStatsController } from "../../../src/modules/analytics/presentation/controllers/LandingPageStatsController";

test("LandingPageStatsController sends the use-case result through the view", async () => {
  let responseBody: unknown;
  let nextError: unknown;
  const controller = new LandingPageStatsController({
    execute: async () => ({ inspectionCount: 12, userCount: 4, freshRate: 75 }),
  });

  await controller.handle(
    {} as Request,
    { json: (body: unknown) => { responseBody = body; } } as Response,
    (error: unknown) => { nextError = error; },
  );

  assert.equal(nextError, undefined);
  assert.deepEqual(responseBody, { inspectionCount: 12, userCount: 4, freshRate: 75 });
});
