import assert from "node:assert/strict";
import test from "node:test";

import { resolveSelectedContactId } from "../src/pages/user/messages/utils/viewState";

const contacts = [
  { id: "admin-1" },
  { id: "user-2" },
] as const;

test("resolveSelectedContactId keeps a valid current selection on both desktop and mobile", () => {
  assert.equal(resolveSelectedContactId(contacts, "user-2", true), "user-2");
  assert.equal(resolveSelectedContactId(contacts, "user-2", false), "user-2");
});

test("resolveSelectedContactId falls back to the first contact on desktop", () => {
  assert.equal(resolveSelectedContactId(contacts, null, true), "admin-1");
  assert.equal(resolveSelectedContactId(contacts, "missing", true), "admin-1");
});

test("resolveSelectedContactId keeps mobile list-first by returning null when the current selection is empty or stale", () => {
  assert.equal(resolveSelectedContactId(contacts, null, false), null);
  assert.equal(resolveSelectedContactId(contacts, "missing", false), null);
  assert.equal(resolveSelectedContactId([], null, false), null);
});
