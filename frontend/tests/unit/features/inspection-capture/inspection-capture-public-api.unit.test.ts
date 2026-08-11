import assert from "node:assert/strict";
import test from "node:test";
import {
  CameraCapture,
  CameraCaptureView,
  useCameraCapture,
} from "../../../../src/features/inspection-capture";

test("inspection capture publishes its feature-owned UI and capture model", () => {
  assert.equal(typeof CameraCapture, "function");
  assert.equal(typeof CameraCaptureView, "function");
  assert.equal(typeof useCameraCapture, "function");
});
