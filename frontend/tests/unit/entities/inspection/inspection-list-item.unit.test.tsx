import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../../../../src/entities/inspection/ui/inspection-list-item.tsx", import.meta.url),
  "utf8",
);

test("inspection cards use the shared meat-type scope policy", () => {
  assert.match(source, /getMeatTypeScopeLabel\(inspection\.meat_type\)/);
  assert.match(source, /text-warning/);
});

test("inspection cards preserve the original meat type field", () => {
  assert.match(source, /\{inspection\.meat_type\}/);
});
