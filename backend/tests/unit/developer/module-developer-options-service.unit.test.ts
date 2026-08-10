import assert from "node:assert/strict";
import "../../setup/env";
import { test } from "node:test";
import { DeveloperOptionsService } from "../../../src/modules/developer/infrastructure/DeveloperOptionsService";

test("developer module owns unlock-token policy", () => {
  assert.equal(typeof DeveloperOptionsService.getInstance, "function");
});
