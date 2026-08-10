import assert from "node:assert/strict";
import { test } from "node:test";
import "../../setup/env";
import { ProfileService } from "../../../src/modules/users/infrastructure/ProfileService";

test("module ProfileService exposes the composed users persistence service", () => {
  assert.equal(typeof ProfileService.getInstance, "function");
});
