import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveActiveModelSelection } from "../../../../src/features/offline-sync/ui/offline-sync-manager";

test("offline sync selects the primary model for anonymous and locked sessions", () => {
  assert.equal(resolveActiveModelSelection(null, false, { selectedModel: "primary" }, false), "primary");
  assert.equal(resolveActiveModelSelection({ id: "admin-1" }, true, { selectedModel: "resnet50" }, false), "primary");
});

test("offline sync selects each configured developer model when unlocked", () => {
  for (const selectedModel of ["primary", "seed123_model2", "default", "resnet50", "ensemble"] as const) {
    assert.equal(
      resolveActiveModelSelection({ id: "admin-1" }, true, { selectedModel }, true),
      selectedModel,
    );
  }
});

test("offline sync always returns primary when developer access is unavailable", () => {
  assert.equal(
    resolveActiveModelSelection(
      { id: "admin-1" },
      false,
      { selectedModel: "ensemble" },
      true,
    ),
    "primary",
  );
});
