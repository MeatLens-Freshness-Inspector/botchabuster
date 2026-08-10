import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("the unused top-level inspection result model is removed", () => {
  assert.equal(existsSync(join(process.cwd(), "src", "models", "InspectionResult.ts")), false);
});
