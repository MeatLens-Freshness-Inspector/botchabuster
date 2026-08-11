import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const frontendPackagePath = path.resolve("frontend/package.json");
const rootPackagePath = path.resolve("package.json");

async function readPackage(packagePath) {
  return JSON.parse(await readFile(packagePath, "utf8"));
}

test("frontend exposes the architecture validation test command", async () => {
  const frontendPackage = await readPackage(frontendPackagePath);

  assert.equal(
    frontendPackage.scripts["test:architecture"],
    'node --test "scripts/check-fsd-boundaries.test.mjs" "scripts/check-source-size.test.mjs"',
  );
});

test("root fast validation runs the frontend architecture gate", async () => {
  const rootPackage = await readPackage(rootPackagePath);

  assert.match(rootPackage.scripts["test:fast"], /npm run test:architecture -w frontend/);
});
