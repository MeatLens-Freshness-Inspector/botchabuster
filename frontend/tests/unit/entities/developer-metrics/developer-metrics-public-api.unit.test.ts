import assert from "node:assert/strict";
import test from "node:test";

import {
  DeveloperDashboardClient,
  developerDashboardClient,
} from "../../../../src/entities/developer-metrics";

test("developer-metrics entity publishes its client singleton", () => {
  assert.equal(typeof DeveloperDashboardClient, "function");
  assert.equal(developerDashboardClient, DeveloperDashboardClient.getInstance());
});
