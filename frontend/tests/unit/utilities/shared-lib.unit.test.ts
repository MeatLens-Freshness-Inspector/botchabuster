import assert from "node:assert/strict";
import test from "node:test";
import { getConfidenceBand, getConfidenceFillClass, getConfidenceTextClass } from "../../../src/shared/lib/confidence-level";
import { cn } from "../../../src/shared/lib/utils";

test("shared class-name utility preserves Tailwind conflict resolution", () => {
  assert.equal(cn("p-2", false, "px-4", "p-3"), "p-3");
});

test("shared confidence utilities preserve each threshold band", () => {
  assert.equal(getConfidenceBand(90), "green");
  assert.equal(getConfidenceBand(80), "yellow");
  assert.equal(getConfidenceBand(70), "orange");
  assert.equal(getConfidenceBand(69), "red");
  assert.equal(getConfidenceTextClass(80), "text-yellow-500");
  assert.equal(getConfidenceFillClass(70), "bg-orange-500");
});
