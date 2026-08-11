export type ConfidenceBand = "green" | "yellow" | "orange" | "red";

export function getConfidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 90) {
    return "green";
  }

  if (confidence >= 80) {
    return "yellow";
  }

  if (confidence >= 70) {
    return "orange";
  }

  return "red";
}

export function getConfidenceTextClass(confidence: number): string {
  const band = getConfidenceBand(confidence);

  if (band === "green") {
    return "text-emerald-500";
  }

  if (band === "yellow") {
    return "text-yellow-500";
  }

  if (band === "orange") {
    return "text-orange-500";
  }

  return "text-red-500";
}

export function getConfidenceFillClass(confidence: number): string {
  const band = getConfidenceBand(confidence);

  if (band === "green") {
    return "bg-emerald-500";
  }

  if (band === "yellow") {
    return "bg-yellow-500";
  }

  if (band === "orange") {
    return "bg-orange-500";
  }

  return "bg-red-500";
}
