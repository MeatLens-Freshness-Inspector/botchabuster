import assert from "node:assert/strict";
import test from "node:test";
import {
  formatInspectionLocationLabel,
  getCoordinateStatusText,
  requestCurrentCoordinates,
} from "../src/lib/inspectionLocation";

test("requestCurrentCoordinates resolves the current GPS position", async () => {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      geolocation: {
        getCurrentPosition(success: PositionCallback) {
          success({
            coords: {
              latitude: 14.5995,
              longitude: 120.9842,
              accuracy: 5,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON() {
                return {};
              },
            },
            timestamp: Date.now(),
            toJSON() {
              return {};
            },
          } as GeolocationPosition);
        },
      },
    },
  });

  const coordinates = await requestCurrentCoordinates();
  assert.deepEqual(coordinates, {
    latitude: 14.5995,
    longitude: 120.9842,
  });
});

test("requestCurrentCoordinates returns null when geolocation fails", async () => {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      geolocation: {
        getCurrentPosition(
          _success: PositionCallback,
          error?: PositionErrorCallback,
        ) {
          error?.({
            code: 1,
            message: "permission denied",
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        },
      },
    },
  });

  const coordinates = await requestCurrentCoordinates();
  assert.equal(coordinates, null);
});

test("formatInspectionLocationLabel appends coordinates beside the manual location", () => {
  assert.equal(
    formatInspectionLocationLabel("Old Market", 14.5995, 120.9842),
    "Old Market (14.599500, 120.984200)",
  );
  assert.equal(
    formatInspectionLocationLabel(null, 14.5995, 120.9842),
    "14.599500, 120.984200",
  );
  assert.equal(
    formatInspectionLocationLabel("Old Market", null, null),
    "Old Market",
  );
  assert.equal(
    getCoordinateStatusText("capturing", null),
    "Capturing GPS coordinates...",
  );
});
