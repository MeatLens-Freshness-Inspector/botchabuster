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

export function formatInspectionLocationLabel(
  location: string | null | undefined,
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): string {
  const manualLocation = location?.trim() ?? "";
  if (!manualLocation) {
    if (latitude == null || longitude == null) return "";
    return `${formatCoordinateValue(latitude)}, ${formatCoordinateValue(longitude)}`;
  }
  if (latitude == null || longitude == null) return manualLocation;

  return `${manualLocation} (${formatCoordinateValue(latitude)}, ${formatCoordinateValue(longitude)})`;
}

export function getCoordinateStatusText(
  status: CoordinateCaptureStatus,
  coordinates: InspectionCoordinates | null,
): string | null {
  if (status === "capturing") {
    return "Capturing GPS coordinates...";
  }

  if (status === "captured" && coordinates) {
    return `${formatCoordinateValue(coordinates.latitude)}, ${formatCoordinateValue(coordinates.longitude)}`;
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
