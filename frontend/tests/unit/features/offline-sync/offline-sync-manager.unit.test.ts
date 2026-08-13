import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveActiveModelVariant } from "../../../../src/features/offline-sync/ui/offline-sync-manager";

test("offline sync selects the stable model for anonymous and locked sessions", () => {
  assert.equal(resolveActiveModelVariant(null, false, { enableModelEnsemble: false, useSeed123Model2: false, useRoboflowModel3: false }, false), "seed123_model2");
  assert.equal(resolveActiveModelVariant({ id: "admin-1" }, true, { enableModelEnsemble: false, useSeed123Model2: false, useRoboflowModel3: false }, false), "seed123_model2");
});

test("offline sync selects the configured developer model when unlocked", () => {
  assert.equal(resolveActiveModelVariant({ id: "admin-1" }, true, { enableModelEnsemble: false, useSeed123Model2: false, useRoboflowModel3: false }, true), "default");
  assert.equal(resolveActiveModelVariant({ id: "admin-1" }, true, { enableModelEnsemble: true, useSeed123Model2: false, useRoboflowModel3: false }, true), "seed123_model2");
});

test("offline sync selects the Roboflow model3 developer option", () => {
  assert.equal(
    resolveActiveModelVariant(
      { id: "admin-1" },
      true,
      { enableModelEnsemble: false, useSeed123Model2: true, useRoboflowModel3: true },
      true,
    ),
    "roboflow_model3",
  );
});
