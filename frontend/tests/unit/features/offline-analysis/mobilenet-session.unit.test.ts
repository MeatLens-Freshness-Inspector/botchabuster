import assert from "node:assert/strict";
import test from "node:test";

import { MobileNetSession } from "../../../../src/features/offline-analysis/lib/mobilenet-session";

test("MobileNetSession starts with the primary model and no loaded runtime", () => {
  const session = new MobileNetSession();

  assert.equal(session.activeModelVariant, "primary");
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

test("MobileNetSession accepts the primary model variant", () => {
  const session = new MobileNetSession();

  assert.equal(session.switchVariant("primary"), null);
  assert.equal(session.activeModelVariant, "primary");
});
