import assert from "node:assert/strict";
import test from "node:test";
import { API_DOCS_OPERATIONS } from "../../../src/pages/admin-dashboard/components/developer/api-docs/catalog";

test("API docs category counts match the registered backend route audit", () => {
  const counts = Object.fromEntries(
    API_DOCS_OPERATIONS.map((operation) => [operation.categoryId, 0]),
  ) as Record<string, number>;

  for (const operation of API_DOCS_OPERATIONS) counts[operation.categoryId] += 1;

  assert.deepEqual(counts, {
    auth: 14,
    analysis: 2,
    "access-codes": 5,
    inspections: 5,
    profiles: 8,
    stats: 1,
    upload: 1,
    chat: 1,
    "market-locations": 3,
    "audit-logs": 2,
    "developer-options": 2,
    "developer-dashboard": 6,
    "user-chat": 3,
  });
});
