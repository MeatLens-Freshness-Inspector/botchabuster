import assert from "node:assert/strict";
import test from "node:test";

import {
  DeveloperOptionsClient,
  developerOptionsClient,
  buildOfflineQueueExportPayload,
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

test("offline queue export reports each mapped scan", () => {
  const progress: string[] = [];
  const scans = [
    { id: "scan-1", imageData: new Uint8Array([1]), analysisResult: null },
    { id: "scan-2", imageData: new Uint8Array([2]), analysisResult: null },
    { id: "scan-3", imageData: new Uint8Array([3]), analysisResult: null },
  ] as never[];

  const payload = buildOfflineQueueExportPayload(scans, (next) => {
    progress.push(`${next.current}/${next.total}`);
  });

  assert.equal(payload.length, 3);
  assert.deepEqual(progress, ["1/3", "2/3", "3/3"]);
});
