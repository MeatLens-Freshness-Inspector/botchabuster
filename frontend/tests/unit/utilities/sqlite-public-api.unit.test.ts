import assert from "node:assert/strict";
import test from "node:test";

import { closeDb, openDb } from "../../../src/shared/platform/sqlite";

test("shared SQLite platform exposes the connection lifecycle contract", () => {
  assert.equal(typeof openDb, "function");
  assert.equal(typeof closeDb, "function");
});
