import assert from "node:assert/strict";

export function assertErrorResponseSchema(value: unknown): asserts value is { error: string } {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), "Error payload must be an object");
  assert.equal(typeof (value as { error?: unknown }).error, "string", "Error payload must expose an error string");
  assert.ok(((value as { error: string }).error).trim().length > 0, "Error payload must not be empty");
}
