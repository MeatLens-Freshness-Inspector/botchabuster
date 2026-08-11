import assert from "node:assert/strict";
import test from "node:test";

import {
  applyCameraTrackConstraints,
  inspectCameraTrack,
  requestCameraStream,
  stopCameraStream,
} from "../../../../src/features/inspection-capture";

function createTrack() {
  const appliedConstraints: MediaTrackConstraintSet[] = [];
  const stopped = { value: false };

  const track = {
    getCapabilities: () => ({
      torch: true,
      focusMode: ["continuous", "manual"],
      focusDistance: { min: 0, max: 10, step: 0.5 },
      zoom: { min: 1, max: 3, step: 0.1 },
    }),
    getSettings: () => ({
      torch: true,
      focusMode: "continuous",
      focusDistance: 4,
      zoom: 2,
    }),
    applyConstraints: async (constraints: MediaTrackConstraints) => {
      appliedConstraints.push(constraints.advanced?.[0] ?? constraints);
    },
    stop: () => {
      stopped.value = true;
    },
  } as unknown as MediaStreamTrack;

  return { track, appliedConstraints, stopped };
}

test("inspectCameraTrack maps supported controls into bounded session state", () => {
  const { track } = createTrack();

  assert.deepEqual(inspectCameraTrack(track), {
    torchSupported: true,
    flashEnabled: true,
    cameraControls: {
      focusModeOptions: ["continuous", "manual"],
      focusMode: "continuous",
      focusDistanceRange: { min: 0, max: 10, step: 0.5 },
      focusDistance: 4,
      brightnessRange: null,
      brightness: null,
      exposureCompensationRange: null,
      exposureCompensation: null,
      apertureRange: null,
      aperture: null,
      zoomRange: { min: 1, max: 3, step: 0.1 },
      zoom: 2,
    },
  });
});

test("requestCameraStream falls back to a basic video request", async () => {
  const requests: MediaStreamConstraints[] = [];
  const expectedStream = {} as MediaStream;
  let attempts = 0;
  const mediaDevices = {
    getUserMedia: async (constraints: MediaStreamConstraints) => {
      requests.push(constraints);
      attempts += 1;
      if (attempts === 1) {
        throw new Error("advanced constraints unsupported");
      }
      return expectedStream;
    },
  } as Pick<MediaDevices, "getUserMedia">;

  assert.equal(await requestCameraStream(mediaDevices), expectedStream);
  assert.deepEqual(requests, [
    {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 960 },
        torch: true,
      },
    },
    { video: true },
  ]);
});

test("device helpers apply constraints and stop every stream track", async () => {
  const { track, appliedConstraints, stopped } = createTrack();

  assert.equal(await applyCameraTrackConstraints(track, { zoom: 2.5 }), true);
  assert.deepEqual(appliedConstraints, [{ zoom: 2.5 }]);

  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  stopCameraStream(stream);
  assert.equal(stopped.value, true);
  stopCameraStream(null);
});
