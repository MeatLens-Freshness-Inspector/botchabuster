import assert from "node:assert/strict";
import test from "node:test";

import {
  DeveloperOptionsClient,
  developerOptionsClient,
  getOfflineQueueExportLabel,
} from "../../../../src/features/developer-tools";
import { DEFAULT_DEVELOPER_OPTIONS_FLAGS } from "../../../../src/features/developer-tools";

test("developer-tools feature publishes its options client singleton", () => {
  assert.equal(typeof DeveloperOptionsClient, "function");
  assert.equal(developerOptionsClient, DeveloperOptionsClient.getInstance());
  assert.equal(DEFAULT_DEVELOPER_OPTIONS_FLAGS.selectedModel, "primary");
});

test("developer-tools exposes the queue export label for loading state", () => {
  assert.equal(getOfflineQueueExportLabel(false), "Export Offline Queue JSON");
  assert.equal(getOfflineQueueExportLabel(true), "Exporting queue...");
});
