import type { CapturedImagePayload } from "@/components/CameraCapture";
import { DEFAULT_MARKET_LOCATIONS } from "@/lib/marketLocations";
import type { AnalysisResult, MeatType } from "@/types/inspection";
import type { InspectionSaveStatus } from "../types";

export const DEFAULT_MEAT_TYPE: MeatType = "pork";
export const FALLBACK_MARKET_LOCATIONS = [...DEFAULT_MARKET_LOCATIONS];
export const FORCE_RETAKE_CONFIDENCE_THRESHOLD = 80;

export function normalizeMarketLocationNames(locationRows: Array<{ name: string }>): string[] {
  const normalizedNames = locationRows
    .map((row) => row.name.trim().replace(/\s+/g, " "))
    .filter(Boolean);

  return normalizedNames.length > 0
    ? Array.from(new Set(normalizedNames))
    : FALLBACK_MARKET_LOCATIONS;
}

export function resolveSelectedLocation(current: string, locations: string[]): string {
  return locations.some((name) => name === current) ? current : locations[0] ?? "";
}

export function createClientSubmissionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const randomNibble = Math.floor(Math.random() * 16);
    const value = char === "x" ? randomNibble : (randomNibble & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function getCaptureStatusText(capturedInput: CapturedImagePayload | null): string {
  return capturedInput ? "Ready" : "Waiting";
}

export function getAnalysisStatusText(
  isAnalyzing: boolean,
  result: AnalysisResult | null,
): string {
  return isAnalyzing ? "Running" : result ? result.classification : "Pending";
}

export function getConfidenceText(result: AnalysisResult | null): string {
  return result ? `${result.confidence_score}%` : "--";
}

export function getSaveButtonLabel(saveStatus: InspectionSaveStatus): string {
  switch (saveStatus) {
    case "saved":
      return "Record Saved";
    case "saving":
      return "Saving...";
    case "queued":
      return "Queued for Sync";
    default:
      return "Save Record";
  }
}
