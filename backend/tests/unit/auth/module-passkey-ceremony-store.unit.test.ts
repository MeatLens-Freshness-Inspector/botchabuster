import assert from "node:assert/strict";
import { test } from "node:test";
import { PasskeyCeremonyStore } from "../../../src/modules/auth/infrastructure/PasskeyCeremonyStore";

test("module PasskeyCeremonyStore consumes a ceremony exactly once", () => {
  const store = new PasskeyCeremonyStore(60_000, () => 1_700_000_000_000);
  store.save("challenge-1", {
    type: "authentication",
    challenge: "challenge-value",
    userId: null,
    rpId: "localhost",
  });

  assert.equal(store.consume("challenge-1")?.challenge, "challenge-value");
  assert.equal(store.consume("challenge-1"), null);
});
