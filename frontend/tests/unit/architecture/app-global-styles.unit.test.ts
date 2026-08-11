import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const globalsStylesPath = new URL("../../../src/app/styles/globals.css", import.meta.url);
const appStylesPath = new URL("../../../src/app/styles/app.css", import.meta.url);
const legacyGlobalsStylesPath = new URL("../../../src/index.css", import.meta.url);
const legacyAppStylesPath = new URL("../../../src/App.css", import.meta.url);

function sha256(path: URL): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

test("app owns global styles without changing their bytes or legacy cascade", () => {
  assert.equal(existsSync(globalsStylesPath), true);
  assert.equal(existsSync(appStylesPath), true);
  assert.equal(existsSync(legacyGlobalsStylesPath), false);
  assert.equal(existsSync(legacyAppStylesPath), false);
  assert.equal(
    sha256(globalsStylesPath),
    "d4879cecbb87e8efcfaf3c5644c1916d89e05943504d851c7fe9ed80676f636c",
  );
  assert.equal(
    sha256(appStylesPath),
    "1b75716b5511ad178574cd3e3656e5e8dd94544456944b4ff1d253c9ecc614d4",
  );
});
