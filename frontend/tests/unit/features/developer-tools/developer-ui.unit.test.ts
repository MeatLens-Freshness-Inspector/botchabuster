import assert from "node:assert/strict";
import test from "node:test";
import { DeveloperExport, DeveloperOptionsPanel, DeveloperOverviewSection } from "@/features/developer-tools";
import {
  ANALYSIS_MODEL_CATALOG,
  formatDeveloperModelOption,
} from "@/features/developer-tools/ui/developer-options-panel";

test("developer-tools publishes migrated overview and options UI", () => {
  assert.equal(typeof DeveloperExport, "function");
  assert.equal(typeof DeveloperOptionsPanel, "function");
  assert.equal(typeof DeveloperOverviewSection, "function");
});

test("developer model options use neutral labels and project-added dates", () => {
  const labels = ANALYSIS_MODEL_CATALOG.map(formatDeveloperModelOption);

  assert.deepEqual(labels, [
    "Primary MobileNetV3 · Added Aug 13, 2026",
    "Seed123 MobileNetV3 · Added May 19, 2026",
    "Legacy MobileNetV3 · Added May 5, 2026",
    "ResNet50 · Added May 1, 2026",
    "Ensemble · Composite mode",
  ]);
  assert.ok(labels.every((label) => !/roboflow|model3/i.test(label)));
});
