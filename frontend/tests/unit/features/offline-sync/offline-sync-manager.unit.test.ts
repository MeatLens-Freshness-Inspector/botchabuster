import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveActiveModelSelection } from "../../../../src/features/offline-sync/ui/offline-sync-manager";

test("offline sync selects the primary model for anonymous and locked sessions", () => {
  assert.equal(resolveActiveModelSelection(null, false, false, { selectedModel: "primary" }, false), "primary");
  assert.equal(resolveActiveModelSelection({ id: "admin-1" }, true, false, { selectedModel: "resnet50" }, true), "primary");
});

test("offline sync selects each configured developer model only for unlocked developers", () => {
  for (const selectedModel of ["primary", "seed123_model2", "default", "resnet50", "ensemble"] as const) {
    assert.equal(
      resolveActiveModelSelection({ id: "developer-1" }, true, true, { selectedModel }, true),
      selectedModel,
    );
  }
});

test("offline sync always returns primary when developer access is unavailable", () => {
  assert.equal(
    resolveActiveModelSelection(
      { id: "admin-1" },
      true,
      false,
      { selectedModel: "ensemble" },
      true,
    ),
    "primary",
  );
});
