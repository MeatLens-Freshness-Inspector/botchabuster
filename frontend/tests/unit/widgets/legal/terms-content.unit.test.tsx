import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../../../../src/widgets/legal/terms-content.tsx", import.meta.url),
  "utf8",
);

test("terms use the canonical freshness vocabulary", () => {
  assert.match(source, /Fresh/);
  assert.match(source, /Warning/);
  assert.match(source, /Spoiled/);
  assert.doesNotMatch(source, /Suspect/);
});
