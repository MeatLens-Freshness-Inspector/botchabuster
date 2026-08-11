import assert from "node:assert/strict";
import test from "node:test";

import {
  clearPendingScans,
  getPendingCount,
  getPendingScans,
  queueScan,
  removeScan,
} from "../../../../src/features/offline-sync/api";

test("offline-sync exposes the native inspection queue adapter contract", () => {
  assert.equal(typeof queueScan, "function");
  assert.equal(typeof getPendingScans, "function");
  assert.equal(typeof getPendingCount, "function");
  assert.equal(typeof removeScan, "function");
  assert.equal(typeof clearPendingScans, "function");
});
