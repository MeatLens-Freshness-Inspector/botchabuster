import assert from "node:assert/strict";
import { test } from "node:test";
import { App, initializeAppRuntime } from "../../../src/app/index";

test("app public entry exposes the root application component", () => {
  assert.equal(typeof App, "function");
  assert.equal(typeof initializeAppRuntime, "function");
});
