import assert from "node:assert/strict";
import test from "node:test";
import { buildApiDocsRequest, useApiDocs } from "@/features/developer-tools";

test("developer-tools publishes the API documentation request flow", () => {
  assert.equal(typeof buildApiDocsRequest, "function");
  assert.equal(typeof useApiDocs, "function");
});
