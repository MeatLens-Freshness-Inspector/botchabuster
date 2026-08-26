import type { ModelAccuracySnapshot } from "@/entities/model-accuracy";
import { formatReportPercentage } from "./formatting";
import type { ReportSection } from "../model/types";

const EMPTY_STATE = "No finalized model accuracy snapshots for this period";

export function buildModelAccuracySection(
  history: readonly ModelAccuracySnapshot[],
): ReportSection {
  const ordered = [...history].sort(
    (left, right) => left.snapshotDate.localeCompare(right.snapshotDate) || left.versionKey.localeCompare(right.versionKey),
  );
  const expectedPoints = ordered.map((snapshot) => ({
    label: `${snapshot.snapshotDate} · ${snapshot.versionKey}`,
    value: snapshot.expectedAccuracy * 100,
  }));
  const observedPoints = ordered
    .filter((snapshot) => snapshot.observedAccuracy !== null)
    .map((snapshot) => ({
      label: `${snapshot.snapshotDate} · ${snapshot.versionKey}`,
      value: (snapshot.observedAccuracy ?? 0) * 100,
    }));

  return {
    id: "model-accuracy-history",
    title: "Historical Model Accuracy",
    narrative: [ordered.length > 0 ? "Expected benchmark accuracy is compared with observed accuracy from officially labeled inspections." : EMPTY_STATE],
    tables: [{
      title: "Daily Model Accuracy Snapshots",
      columns: ["Date", "Model Version", "Expected", "Observed", "Evaluated", "Correct"],
      rows: ordered.map((snapshot) => [
        snapshot.snapshotDate,
        snapshot.displayName || snapshot.versionKey,
        formatReportPercentage(snapshot.expectedAccuracy * 100),
        snapshot.observedAccuracy === null ? "Unavailable" : formatReportPercentage(snapshot.observedAccuracy * 100),
        String(snapshot.evaluatedCount),
        String(snapshot.correctCount),
      ]),
    }],
    charts: [{
      id: "model-accuracy-trend",
      title: "Expected vs Observed Accuracy",
      kind: "line",
      points: [],
      series: [
        { name: "Expected Accuracy", color: "#2563eb", points: expectedPoints },
        { name: "Observed Accuracy", color: "#16a34a", points: observedPoints },
      ],
      emptyState: EMPTY_STATE,
    }],
  };
}
