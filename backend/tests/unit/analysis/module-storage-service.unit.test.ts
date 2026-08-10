import assert from "node:assert/strict";
import "../../setup/env";
import { test } from "node:test";
import { StorageService } from "../../../src/modules/analysis/infrastructure/StorageService";

test("module StorageService exposes the composed image storage component", () => {
  assert.equal(typeof StorageService.getInstance, "function");
});
