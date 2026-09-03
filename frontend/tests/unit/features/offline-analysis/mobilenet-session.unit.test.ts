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

test("MobileNetSession preserves each loaded runtime when switching variants", () => {
  const session = new MobileNetSession();
  const primarySession = {} as NonNullable<typeof session.session>;
  const legacySession = {} as NonNullable<typeof session.session>;

  session.session = primarySession;
  session.loadedModelPath = "/model/primary.onnx";

  assert.equal(session.switchVariant("default"), primarySession);
  assert.equal(session.activeModelVariant, "default");
  assert.equal(session.session, null);
  assert.equal(session.loadedModelPath, null);

  session.session = legacySession;
  session.loadedModelPath = "/model/legacy.onnx";

  session.switchVariant("primary");
  assert.equal(session.session, primarySession);
  assert.equal(session.loadedModelPath, "/model/primary.onnx");

  session.switchVariant("default");
  assert.equal(session.session, legacySession);
  assert.equal(session.loadedModelPath, "/model/legacy.onnx");
});

test("MobileNetSession accepts the primary model variant", () => {
  const session = new MobileNetSession();

  assert.equal(session.switchVariant("primary"), null);
  assert.equal(session.activeModelVariant, "primary");
});

test("keeps load generations and retry state independent per variant", () => {
  const session = new MobileNetSession();
  const primary = session.getRuntime("primary");
  const legacy = session.getRuntime("default");

  primary.loadGeneration = 4;
  primary.nextRetryAt = 100;
  legacy.loadGeneration = 2;
  legacy.nextRetryAt = 200;

  session.resetVariant("primary");

  assert.equal(primary.loadGeneration, 5);
  assert.equal(primary.nextRetryAt, 0);
  assert.equal(legacy.loadGeneration, 2);
  assert.equal(legacy.nextRetryAt, 200);
});
