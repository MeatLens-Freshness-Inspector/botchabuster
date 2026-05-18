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
    return "text-fresh";
  }

  if (band === "yellow") {
    return "text-acceptable";
  }

  if (band === "orange") {
    return "text-warning";
  }

  return "text-spoiled";
}

export function getConfidenceFillClass(confidence: number): string {
  const band = getConfidenceBand(confidence);

  if (band === "green") {
    return "bg-[hsl(var(--fresh))]";
  }

  if (band === "yellow") {
    return "bg-[hsl(var(--acceptable))]";
  }

  if (band === "orange") {
    return "bg-[hsl(var(--warning))]";
  }

  return "bg-[hsl(var(--spoiled))]";
}
