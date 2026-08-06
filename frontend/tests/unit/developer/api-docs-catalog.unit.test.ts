import assert from "node:assert/strict";
import test from "node:test";
import {
  API_DOCS_CATEGORIES,
  API_DOCS_OPERATIONS,
} from "../../../src/pages/admin-dashboard/components/developer/api-docs/catalog";

test("catalog contains every API route operation exactly once", () => {
  assert.equal(API_DOCS_OPERATIONS.length, 53);
  assert.equal(new Set(API_DOCS_OPERATIONS.map((operation) => operation.id)).size, 53);
  assert.deepEqual(
    API_DOCS_CATEGORIES.map((category) => category.id),
    [
      "auth",
      "analysis",
      "access-codes",
      "inspections",
      "profiles",
      "stats",
      "upload",
      "chat",
      "market-locations",
      "audit-logs",
      "developer-options",
      "developer-dashboard",
      "user-chat",
    ],
  );

  for (const operation of API_DOCS_OPERATIONS) {
    assert.ok(operation.categoryId);
    assert.ok(operation.path.startsWith("/"));
    assert.ok(["GET", "POST", "PUT", "PATCH", "DELETE"].includes(operation.method));
  }
});
