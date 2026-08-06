import assert from "node:assert/strict";
import test from "node:test";
import {
  buildApiDocsCurl,
} from "../../../src/pages/admin-dashboard/components/developer/api-docs/curl";
import {
  clearApiDocsHistory,
  loadApiDocsHistory,
  saveApiDocsHistory,
  toApiDocsReplayValues,
} from "../../../src/pages/admin-dashboard/components/developer/api-docs/history";
import type { ApiDocsHistoryEntry } from "../../../src/pages/admin-dashboard/components/developer/api-docs/history";
import type { ApiDocsRequest } from "../../../src/pages/admin-dashboard/components/developer/api-docs/request";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

const request: ApiDocsRequest = {
  url: "http://localhost:3001/api/inspections",
  safeUrl: "http://localhost:3001/api/inspections",
  init: {
    method: "POST",
    headers: new Headers({
      Authorization: "Bearer do-not-copy",
      "X-CSRF-Token": "csrf-do-not-copy",
      "Content-Type": "application/json",
      "X-Debug": "enabled",
    }),
    body: '{"ok":true}',
  },
  headers: new Headers({
    Authorization: "Bearer do-not-copy",
    "X-CSRF-Token": "csrf-do-not-copy",
    "Content-Type": "application/json",
    "X-Debug": "enabled",
  }),
  bodyPreview: '{"ok":true}',
  curlBodyParts: [],
};

function historyEntry(id: number): ApiDocsHistoryEntry {
  return {
    id: `history-${id}`,
    operationId: "inspections-create",
    method: "POST",
    url: request.url,
    headers: {
      Authorization: "Bearer do-not-copy",
      "X-CSRF-Token": "csrf-do-not-copy",
      "Content-Type": "application/json",
    },
    values: { path: {}, query: {}, headers: { "X-Debug": "enabled" }, body: '{"ok":true}' },
    status: 200,
    elapsedMs: 12,
    createdAt: new Date(2026, 7, 6, 10, 0, id).toISOString(),
  };
}

test("builds cURL without protected authentication headers", () => {
  const curl = buildApiDocsCurl(request);

  assert.match(curl, /^curl -X POST /);
  assert.match(curl, /-H 'content-type: application\/json'/);
  assert.match(curl, /-H 'x-debug: enabled'/);
  assert.match(curl, /--data-raw '\{"ok":true\}'$/);
  assert.doesNotMatch(curl, /Authorization|X-CSRF-Token|do-not-copy|csrf-do-not-copy/);
});

test("caps history at 20 records and removes protected headers", () => {
  const storage = new MemoryStorage();
  for (let index = 0; index < 21; index += 1) {
    saveApiDocsHistory(historyEntry(index), storage);
  }

  const entries = loadApiDocsHistory(storage);
  assert.equal(entries.length, 20);
  assert.equal(entries[0].id, "history-20");
  assert.equal(entries.at(-1)?.id, "history-1");
  assert.deepEqual(entries[0].headers, { "Content-Type": "application/json" });
  assert.deepEqual(entries[0].values.headers, { "X-Debug": "enabled" });
});

test("ignores malformed history and can clear it", () => {
  const storage = new MemoryStorage();
  storage.setItem("meatlens-api-docs-history", "{bad");
  assert.deepEqual(loadApiDocsHistory(storage), []);

  saveApiDocsHistory(historyEntry(1), storage);
  clearApiDocsHistory(storage);
  assert.deepEqual(loadApiDocsHistory(storage), []);
});

test("replay values restore editable fields without file objects", () => {
  const values = toApiDocsReplayValues(historyEntry(1));
  assert.deepEqual(values, {
    path: {},
    query: {},
    headers: { "X-Debug": "enabled" },
    body: '{"ok":true}',
    files: {},
  });
});
