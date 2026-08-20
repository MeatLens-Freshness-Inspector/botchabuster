import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const globalsStylesPath = new URL("../../../src/app/styles/globals.css", import.meta.url);
const appStylesPath = new URL("../../../src/app/styles/app.css", import.meta.url);
const legacyGlobalsStylesPath = new URL("../../../src/index.css", import.meta.url);
const legacyAppStylesPath = new URL("../../../src/App.css", import.meta.url);

function sha256(path: URL): string {
  // Git checks these stylesheets out with LF on CI and may convert them to
  // CRLF on Windows. Hash the canonical repository representation so the
  // ownership contract is independent of the local checkout's line endings.
  const canonical = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  return createHash("sha256").update(canonical).digest("hex");
}

test("app owns global styles without changing their bytes or legacy cascade", () => {
  assert.equal(existsSync(globalsStylesPath), true);
  assert.equal(existsSync(appStylesPath), true);
  assert.equal(existsSync(legacyGlobalsStylesPath), false);
  assert.equal(existsSync(legacyAppStylesPath), false);
  assert.equal(
    sha256(globalsStylesPath),
    "56f7272d5f44946ab5cc546c5f36ccbaef059dbb8d9201de0ab4903e844b5db4",
  );
  assert.equal(
    sha256(appStylesPath),
    "a0715e0a09edbd0fbde65816a75e0fa0fc8b314c5260c0768c19bf3aac22621a",
  );
});
