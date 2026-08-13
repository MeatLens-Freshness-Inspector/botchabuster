import assert from "node:assert/strict";
import test from "node:test";

import { MobileNetSession } from "../../../../src/features/offline-analysis/lib/mobilenet-session";

test("MobileNetSession starts with the stable developer model and no loaded runtime", () => {
  const session = new MobileNetSession();

  assert.equal(session.activeModelVariant, "seed123_model2");
  assert.equal(session.session, null);
  assert.equal(session.loadedModelPath, null);
  assert.equal(session.loadGeneration, 0);
});

test("MobileNetSession invalidates a loaded runtime when switching variants", () => {
  const session = new MobileNetSession();
  const previousSession = {} as NonNullable<typeof session.session>;
  session.session = previousSession;
  session.loadedModelPath = "/model/current.onnx";

  assert.equal(session.switchVariant("default"), previousSession);
  assert.equal(session.activeModelVariant, "default");
  assert.equal(session.session, null);
  assert.equal(session.loadedModelPath, null);
  assert.equal(session.loadGeneration, 1);
});

test("MobileNetSession accepts the Roboflow model3 variant", () => {
  const session = new MobileNetSession();

  assert.equal(session.switchVariant("roboflow_model3"), null);
  assert.equal(session.activeModelVariant, "roboflow_model3");
});
