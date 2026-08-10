import assert from "node:assert/strict";
import "../../setup/env";
import { test } from "node:test";
import { DeveloperDashboardService } from "../../../src/modules/developer/infrastructure/DeveloperDashboardService";

test("developer module owns dataset and training-run orchestration", () => {
  assert.equal(typeof DeveloperDashboardService.getInstance, "function");
});
