import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const backendRoot = process.cwd();

test("legacy routes and controllers are absent", () => {
  assert.equal(existsSync(join(backendRoot, "src/routes")), false);
  assert.equal(existsSync(join(backendRoot, "src/controllers")), false);
});
