import assert from "node:assert/strict";
import "../../setup/env";
import { test } from "node:test";
import { MarketLocationService } from "../../../src/modules/markets/infrastructure/MarketLocationService";

test("module MarketLocationService exposes the market persistence component", () => {
  assert.equal(typeof MarketLocationService.getInstance, "function");
});
