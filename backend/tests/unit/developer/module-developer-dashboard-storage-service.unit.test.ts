import assert from "node:assert/strict";
import "../../setup/env";
import { test } from "node:test";
import { DeveloperDashboardStorageService } from "../../../src/modules/developer/infrastructure/DeveloperDashboardStorageService";

test("developer module owns training artifact storage", () => {
  assert.equal(typeof DeveloperDashboardStorageService.getInstance, "function");
});
