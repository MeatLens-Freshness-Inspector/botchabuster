import assert from "node:assert/strict";
import test from "node:test";
import { DeveloperExport, DeveloperOptionsPanel, DeveloperOverviewSection } from "@/features/developer-tools";

test("developer-tools publishes migrated overview and options UI", () => {
  assert.equal(typeof DeveloperExport, "function");
  assert.equal(typeof DeveloperOptionsPanel, "function");
  assert.equal(typeof DeveloperOverviewSection, "function");
});
