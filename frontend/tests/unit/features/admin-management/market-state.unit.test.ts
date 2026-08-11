import assert from "node:assert/strict";
import test from "node:test";
import { useMarketForm, useMarketLocations } from "@/features/admin-management";

test("admin management publishes market-location state hooks", () => {
  assert.equal(typeof useMarketForm, "function");
  assert.equal(typeof useMarketLocations, "function");
});
