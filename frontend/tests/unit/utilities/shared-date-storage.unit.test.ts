import assert from "node:assert/strict";
import test from "node:test";
import { format } from "date-fns";
import { formatDateTime } from "../../../src/shared/lib/date-time";
import { readJson, writeJson } from "../../../src/shared/lib/storage";

function createStorage(): Storage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } as Storage;
}

test("shared date formatter preserves empty and invalid report values", () => {
  assert.equal(formatDateTime(null), "-");
  assert.equal(formatDateTime("not-a-date"), "not-a-date");
  const value = "2026-08-11T08:30:00Z";
  assert.equal(formatDateTime(value), format(new Date(value), "yyyy-MM-dd HH:mm:ss"));
});

test("shared storage helpers round-trip valid JSON and reject malformed values", () => {
  const storage = createStorage();

  writeJson(storage, "key", { value: 42 });
  assert.deepEqual(readJson<{ value: number }>(storage, "key"), { value: 42 });
  storage.setItem("key", "not-json");
  assert.equal(readJson(storage, "key"), null);
});
