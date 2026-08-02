import assert from "node:assert/strict";
import test from "node:test";
import { FakeModelGateway } from "../../support/modelFake";
import { assertFreshnessPredictionContract } from "../../../../tests/contracts/schemas/analysis-response.schema";

test("fake model gateway predictions satisfy the ML boundary contract", async () => {
  const gateway = new FakeModelGateway();
  const prediction = await gateway.analyze(Buffer.from("fixture"), "pork");

  assertFreshnessPredictionContract(prediction);
  assert.equal(gateway.calls.length, 1);
  assert.equal(gateway.calls[0]?.meatType, "pork");
});

test("the ML boundary contract rejects malformed probability payloads", () => {
  assert.throws(
    () =>
      assertFreshnessPredictionContract({
        label: "fresh",
        confidence: 0.75,
        probabilities: {
          fresh: 0.2,
          not_fresh: 0.2,
          spoiled: 0.2,
        },
        modelVersion: "broken-model",
        inferenceTimeMs: 10,
      }),
    /sum to 1\.0/i,
  );
});
