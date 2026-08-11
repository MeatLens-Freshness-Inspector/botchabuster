import assert from "node:assert/strict";
import test from "node:test";
import { ApiDocsSection, ApiDocsRequestPanel, ApiDocsResponsePanel } from "@/features/developer-tools";

test("developer-tools publishes API documentation UI ownership", () => {
  assert.equal(typeof ApiDocsSection, "function");
  assert.equal(typeof ApiDocsRequestPanel, "function");
  assert.equal(typeof ApiDocsResponsePanel, "function");
});
