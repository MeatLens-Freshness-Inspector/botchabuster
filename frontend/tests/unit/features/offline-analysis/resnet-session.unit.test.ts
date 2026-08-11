import assert from "node:assert/strict";
import test from "node:test";

import { ResNetSession } from "../../../../src/features/offline-analysis/lib/resnet-session";

test("ResNetSession starts without a loaded runtime", () => {
  const session = new ResNetSession();

  assert.equal(session.session, null);
  assert.equal(session.loadedModelPath, null);
  assert.equal(session.loadGeneration, 0);
});

test("ResNetSession invalidates the active runtime when reset", () => {
  const session = new ResNetSession();
  const previousSession = {} as NonNullable<typeof session.session>;
  session.session = previousSession;
  session.loadedModelPath = "/model/current.onnx";

  assert.equal(session.reset(), previousSession);
  assert.equal(session.session, null);
  assert.equal(session.loadedModelPath, null);
  assert.equal(session.loadGeneration, 1);
});
