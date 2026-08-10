import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("app bootstrap mounts the composed module router registry", () => {
  const source = readFileSync(join(process.cwd(), "src", "app.ts"), "utf8");

  assert.match(source, /from ["']\.\/bootstrap\/routes["']/);
  assert.doesNotMatch(source, /from ["']\.\/routes\//);
});
