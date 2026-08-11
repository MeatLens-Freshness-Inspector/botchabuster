import assert from "node:assert/strict";
import test from "node:test";
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
  assert.equal(formatDateTime("2026-08-11T08:30:00Z"), "2026-08-11 16:30:00");
});

test("shared storage helpers round-trip valid JSON and reject malformed values", () => {
  const storage = createStorage();

  writeJson(storage, "key", { value: 42 });
  assert.deepEqual(readJson<{ value: number }>(storage, "key"), { value: 42 });
  storage.setItem("key", "not-json");
  assert.equal(readJson(storage, "key"), null);
});
