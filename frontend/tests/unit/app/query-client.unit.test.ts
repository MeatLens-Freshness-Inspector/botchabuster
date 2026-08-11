import assert from "node:assert/strict";
import test from "node:test";
import { queryClient, shouldRetryQuery } from "../../../src/app/config/query-client";

test("app query client preserves the existing cache lifetimes", () => {
  const queryDefaults = queryClient.getDefaultOptions().queries;

  assert.equal(queryDefaults?.staleTime, 1000 * 60 * 5);
  assert.equal(queryDefaults?.gcTime, 1000 * 60 * 60 * 24);
});

test("app query client retries twice only while online", () => {
  assert.equal(shouldRetryQuery(0, false), false);
  assert.equal(shouldRetryQuery(0, true), true);
  assert.equal(shouldRetryQuery(1, true), true);
  assert.equal(shouldRetryQuery(2, true), false);
});
