import assert from "node:assert/strict";
import test from "node:test";

import {
  MarketLocationClient,
  marketLocationClient,
} from "../../../../src/entities/market-location";

test("market-location entity publishes its client singleton", () => {
  assert.equal(typeof MarketLocationClient, "function");
  assert.equal(marketLocationClient, MarketLocationClient.getInstance());
});
