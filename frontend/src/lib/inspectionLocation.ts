export type InspectionCoordinates = {
  latitude: number;
  longitude: number;
};

export type CoordinateCaptureStatus =
  | "idle"
  | "capturing"
  | "captured"
  | "unavailable";

export function formatCoordinateValue(value: number): string {
  return value.toFixed(6);
}

export function formatInspectionCoordinateLabel(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): string {
  if (latitude == null || longitude == null) {
    return "";
  }

  return `Lat: ${formatCoordinateValue(latitude)} | Long: ${formatCoordinateValue(longitude)}`;
}

export function formatInspectionLocationLabel(
  location: string | null | undefined,
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): string {
  const manualLocation = location?.trim() ?? "";
  const coordinateLabel = formatInspectionCoordinateLabel(latitude, longitude);

  if (!manualLocation) {
    return coordinateLabel;
  }

  if (!coordinateLabel) {
    return manualLocation;
  }

  return `${manualLocation} | ${coordinateLabel}`;
}

export function getCoordinateStatusText(
  status: CoordinateCaptureStatus,
  coordinates: InspectionCoordinates | null,
): string | null {
  if (status === "capturing") {
    return "Capturing GPS coordinates...";
  }

  if (status === "captured" && coordinates) {
    return formatInspectionCoordinateLabel(
      coordinates.latitude,
      coordinates.longitude,
    );
  }

  if (status === "unavailable") {
    return "GPS coordinates unavailable for this capture";
  }

  return null;
}

export async function requestCurrentCoordinates(
  geolocation: Geolocation | undefined = globalThis.navigator?.geolocation,
): Promise<InspectionCoordinates | null> {
  if (!geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => resolve(null),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10_000,
      },
    );
  });
}
