import assert from "node:assert/strict";
import "../../setup/env";
import { test } from "node:test";
import { AccessCodeService } from "../../../src/modules/access-codes/infrastructure/AccessCodeService";

test("module AccessCodeService exposes the access-code persistence component", () => {
  assert.equal(typeof AccessCodeService.getInstance, "function");
});
