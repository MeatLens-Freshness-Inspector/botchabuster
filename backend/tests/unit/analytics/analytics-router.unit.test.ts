import assert from "node:assert/strict";
import { test } from "node:test";
import { createAnalyticsRouter } from "../../../src/modules/analytics/presentation/routes";

test("analytics router exposes the landing-page MVC endpoint", () => {
  const router = createAnalyticsRouter({
    execute: async () => ({ inspectionCount: 1, userCount: 2, freshRate: 100 }),
  });

  const layer = (router as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> }).stack
    .find((entry) => entry.route?.path === "/landing-page");

  assert.ok(layer?.route);
  assert.equal(layer.route.methods.get, true);
});
