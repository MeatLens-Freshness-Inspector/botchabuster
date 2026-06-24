import assert from "node:assert/strict";
import test from "node:test";
import { PasskeyCeremonyStore } from "../src/services/PasskeyCeremonyStore";

test("stores and consumes ceremony challenges exactly once", () => {
  const issuedAt = Date.UTC(2026, 5, 20, 11, 0, 0);
  const store = new PasskeyCeremonyStore(60_000, () => issuedAt);

  store.save("challenge-1", {
    challenge: "abc123",
    type: "authentication",
    origin: "http://localhost:8080",
    rpId: "localhost",
  });

  const stored = store.consume("challenge-1");
  assert.deepEqual(stored, {
    challenge: "abc123",
    type: "authentication",
    origin: "http://localhost:8080",
    rpId: "localhost",
  });

  assert.equal(store.consume("challenge-1"), null);
});

test("rejects expired ceremony challenges", () => {
  const issuedAt = Date.UTC(2026, 5, 20, 11, 0, 0);
  const store = new PasskeyCeremonyStore(60_000, () => issuedAt);

  store.save("challenge-2", {
    challenge: "xyz789",
    type: "registration",
    origin: "http://localhost:8080",
    rpId: "localhost",
    userId: "user-1",
  });

  const expiredReader = new PasskeyCeremonyStore(60_000, () => issuedAt + 61_000);
  expiredReader.hydrateFrom(store);

  assert.equal(expiredReader.consume("challenge-2"), null);
});
