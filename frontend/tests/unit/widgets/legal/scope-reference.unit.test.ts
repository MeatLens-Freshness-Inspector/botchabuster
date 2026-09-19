import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectScopeReminder,
  scopeReferencePage,
} from "../../../../src/widgets/legal/scope-reference";

test("scope reference recommends capable devices without making them required", () => {
  const scopeText = JSON.stringify(scopeReferencePage);
  const reminderText = JSON.stringify(inspectScopeReminder);

  assert.match(scopeText, /Android 12/);
  assert.match(scopeText, /iOS 22/);
  assert.match(scopeText, /8 GB of RAM/);
  assert.match(scopeText, /at least 50 MP/);
  assert.match(scopeText, /may still work/);
  assert.match(reminderText, /Recommended device/);
});

test("scope reference limits output to freshness and excludes health assessment", () => {
  const scopeText = JSON.stringify(scopeReferencePage);
  const reminderText = JSON.stringify(inspectScopeReminder);

  assert.match(scopeText, /Fresh, Not Fresh, or Spoiled/);
  assert.match(scopeText, /does not assess sickness/);
  assert.match(reminderText, /Freshness classification only/);
});
