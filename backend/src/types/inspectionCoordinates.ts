import type { InspectionInsert } from "./inspection";

export type InspectionCoordinateFields = Pick<
  InspectionInsert,
  "location_latitude" | "location_longitude"
>;

function normalizeOptionalCoordinate(
  value: unknown,
  fieldName: "location_latitude" | "location_longitude",
): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  return parsed;
}

export function normalizeInspectionCoordinates(input: {
  location_latitude?: unknown;
  location_longitude?: unknown;
}): InspectionCoordinateFields {
  return {
    location_latitude: normalizeOptionalCoordinate(
      input.location_latitude,
      "location_latitude",
    ),
    location_longitude: normalizeOptionalCoordinate(
      input.location_longitude,
      "location_longitude",
    ),
  };
}

export function mergeInspectionCoordinates<T extends Record<string, unknown>>(
  payload: T,
  coordinates: InspectionCoordinateFields,
): T & InspectionCoordinateFields {
  const next = { ...payload } as T & InspectionCoordinateFields;

  if (coordinates.location_latitude !== undefined) {
    next.location_latitude = coordinates.location_latitude;
  }

  if (coordinates.location_longitude !== undefined) {
    next.location_longitude = coordinates.location_longitude;
  }

  return next;
}
