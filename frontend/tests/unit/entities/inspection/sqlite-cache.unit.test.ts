import assert from "node:assert/strict";
import test from "node:test";

import { buildInspectionHistoryStats } from "../../../../src/entities/inspection";

test("inspection entity exposes SQLite cache statistics through its public API", () => {
  const stats = buildInspectionHistoryStats([
    { classification: "fresh" },
    { classification: "spoiled" },
    { classification: "fresh" },
  ] as never[]);

  assert.deepEqual(stats, {
    total: 3,
    byClassification: {
      fresh: 2,
      "not fresh": 0,
      acceptable: 0,
      warning: 0,
      spoiled: 1,
    },
  });
});
