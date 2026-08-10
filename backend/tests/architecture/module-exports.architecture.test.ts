import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const sourceRoot = join(process.cwd(), "src", "modules");

test("each module exposes an index.ts composition surface", () => {
  assert.ok(existsSync(sourceRoot), "src/modules must exist before module export checks run");

  const moduleNames = readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert.ok(moduleNames.length > 0, "at least one module must be present");
  for (const moduleName of moduleNames) {
    assert.ok(existsSync(join(sourceRoot, moduleName, "index.ts")), `${moduleName} must expose index.ts`);
  }
});
