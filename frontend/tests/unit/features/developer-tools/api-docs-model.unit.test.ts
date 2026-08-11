import assert from "node:assert/strict";
import test from "node:test";
import { API_DOCS_CATEGORIES, API_DOCS_OPERATIONS } from "@/features/developer-tools";

test("developer-tools publishes the API documentation catalog", () => {
  assert.ok(API_DOCS_CATEGORIES.length > 0);
  assert.ok(API_DOCS_OPERATIONS.length > 0);
});
