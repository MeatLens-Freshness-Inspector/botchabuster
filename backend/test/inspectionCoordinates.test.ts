import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeInspectionCoordinates,
  normalizeInspectionCoordinates,
} from "../src/types/inspectionCoordinates";

test("normalizeInspectionCoordinates preserves valid numbers and explicit nulls", () => {
  assert.deepEqual(
    normalizeInspectionCoordinates({
      location_latitude: 14.5995,
      location_longitude: "120.9842",
    }),
    {
      location_latitude: 14.5995,
      location_longitude: 120.9842,
    },
  );

  assert.deepEqual(
    normalizeInspectionCoordinates({
      location_latitude: null,
      location_longitude: undefined,
    }),
    {
      location_latitude: null,
      location_longitude: undefined,
    },
  );
});

test("normalizeInspectionCoordinates rejects non-numeric values", () => {
  assert.throws(
    () =>
      normalizeInspectionCoordinates({
        location_latitude: "north",
      }),
    /location_latitude must be a valid number/i,
  );

  assert.throws(
    () =>
      normalizeInspectionCoordinates({
        location_longitude: {},
      }),
    /location_longitude must be a valid number/i,
  );
});

test("mergeInspectionCoordinates only appends provided coordinate fields", () => {
  assert.deepEqual(
    mergeInspectionCoordinates(
      {
        location: "Old Market",
      },
      {
        location_latitude: 14.5995,
        location_longitude: null,
      },
    ),
    {
      location: "Old Market",
      location_latitude: 14.5995,
      location_longitude: null,
    },
  );
});
