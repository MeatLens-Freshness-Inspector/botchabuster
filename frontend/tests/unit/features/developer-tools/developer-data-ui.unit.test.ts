import assert from "node:assert/strict";
import test from "node:test";
import { DeveloperDatasetsSection, DeveloperTrainingSection } from "@/features/developer-tools";

test("developer-tools publishes dataset and training UI", () => {
  assert.equal(typeof DeveloperDatasetsSection, "function");
  assert.equal(typeof DeveloperTrainingSection, "function");
});
