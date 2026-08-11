import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const eslintConfigPath = new URL("../../../eslint.config.js", import.meta.url);

test("FSD source files reject imports from legacy component ownership", async () => {
  const eslintConfig = await readFile(eslintConfigPath, "utf8");

  assert.match(eslintConfig, /no-restricted-imports/);
  assert.match(eslintConfig, /@\/components\/\*\*/);
});

test("FSD source files reject imports from legacy state and integration ownership", async () => {
  const eslintConfig = await readFile(eslintConfigPath, "utf8");

  assert.match(eslintConfig, /@\/contexts\/\*\*/);
  assert.match(eslintConfig, /@\/hooks\/\*\*/);
  assert.match(eslintConfig, /@\/integrations\/\*\*/);
  assert.match(eslintConfig, /@\/lib\/\*\*/);
});

test("legacy pages remain outside FSD lint restrictions until their migration", async () => {
  const eslintConfig = await readFile(eslintConfigPath, "utf8");

  assert.equal(eslintConfig.includes('"src/pages/**/*.{ts,tsx}"'), false);
});
