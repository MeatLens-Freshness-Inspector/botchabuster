import assert from "node:assert/strict";
import test from "node:test";

import {
  clearPendingScans,
  getPendingCount,
  getPendingScans,
  queueScan,
  removeScan,
} from "../../../../src/features/offline-sync";

test("offline sync exposes the inspection queue through its feature public API", () => {
  assert.equal(typeof queueScan, "function");
  assert.equal(typeof getPendingScans, "function");
  assert.equal(typeof getPendingCount, "function");
  assert.equal(typeof removeScan, "function");
  assert.equal(typeof clearPendingScans, "function");
});
