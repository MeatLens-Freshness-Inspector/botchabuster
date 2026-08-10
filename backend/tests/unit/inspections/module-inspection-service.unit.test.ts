import assert from "node:assert/strict";
import "../../setup/env";
import { test } from "node:test";
import { InspectionService } from "../../../src/modules/inspections/infrastructure/InspectionService";

test("inspections module owns inspection persistence", () => {
  assert.equal(typeof InspectionService.getInstance, "function");
});
