import assert from "node:assert/strict";
import test from "node:test";
import {
  UploadClient,
  uploadClient,
} from "../../../../src/features/inspection-submission";

test("inspection submission publishes the upload client through its feature API", () => {
  assert.equal(typeof UploadClient, "function");
  assert.equal(uploadClient, UploadClient.getInstance());
  assert.equal(typeof uploadClient.uploadInspectionImage, "function");
});
