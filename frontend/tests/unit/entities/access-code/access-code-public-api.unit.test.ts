import assert from "node:assert/strict";
import test from "node:test";

import {
  AccessCodeClient,
  accessCodeClient,
} from "../../../../src/entities/access-code";

test("access-code entity publishes its client singleton", () => {
  assert.equal(typeof AccessCodeClient, "function");
  assert.equal(accessCodeClient, AccessCodeClient.getInstance());
});
