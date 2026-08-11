import assert from "node:assert/strict";
import test from "node:test";

import {
  DeveloperOptionsClient,
  developerOptionsClient,
} from "../../../../src/features/developer-tools";

test("developer-tools feature publishes its options client singleton", () => {
  assert.equal(typeof DeveloperOptionsClient, "function");
  assert.equal(developerOptionsClient, DeveloperOptionsClient.getInstance());
});
