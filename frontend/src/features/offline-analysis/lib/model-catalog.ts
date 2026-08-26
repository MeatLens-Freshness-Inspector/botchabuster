export type MobileNetModelVariant = "primary" | "seed123_model2" | "default";

export type AnalysisModelSelection = MobileNetModelVariant | "resnet50" | "ensemble";

export type AnalysisModelRuntime = "mobilenetv3" | "resnet50" | "ensemble";

export interface AnalysisModelCatalogEntry {
  value: AnalysisModelSelection;
  label: string;
  runtime: AnalysisModelRuntime;
  addedOn: string | null;
  addedOnLabel: string;
  versionKey: string;
  isPrimary?: boolean;
}

export const PRIMARY_ANALYSIS_MODEL: AnalysisModelSelection = "primary";

export const ANALYSIS_MODEL_CATALOG: readonly AnalysisModelCatalogEntry[] = [
  {
    value: "primary",
    label: "Primary MobileNetV3",
    runtime: "mobilenetv3",
    addedOn: "2026-08-13",
    addedOnLabel: "Added Aug 13, 2026",
    versionKey: "mobilenet-primary-2026-08-13",
    isPrimary: true,
  },
  {
    value: "seed123_model2",
    label: "Seed123 MobileNetV3",
    runtime: "mobilenetv3",
    addedOn: "2026-05-19",
    addedOnLabel: "Added May 19, 2026",
    versionKey: "mobilenet-seed123-model2-2026-05-19",
  },
  {
    value: "default",
    label: "Legacy MobileNetV3",
    runtime: "mobilenetv3",
    addedOn: "2026-05-05",
    addedOnLabel: "Added May 5, 2026",
    versionKey: "mobilenet-legacy-2026-05-05",
  },
  {
    value: "resnet50",
    label: "ResNet50",
    runtime: "resnet50",
    addedOn: "2026-05-01",
    addedOnLabel: "Added May 1, 2026",
    versionKey: "resnet50-2026-05-01",
  },
  {
    value: "ensemble",
    label: "Ensemble",
    runtime: "ensemble",
    addedOn: null,
    addedOnLabel: "Composite mode",
    versionKey: "ensemble-2026-08-26",
  },
] as const;

const MODEL_SELECTIONS = new Set<AnalysisModelSelection>(
  ANALYSIS_MODEL_CATALOG.map((entry) => entry.value),
);

export function isAnalysisModelSelection(value: unknown): value is AnalysisModelSelection {
  return typeof value === "string" && MODEL_SELECTIONS.has(value as AnalysisModelSelection);
}

export function getAnalysisModelVersionKey(selection: AnalysisModelSelection): string {
  const entry = ANALYSIS_MODEL_CATALOG.find((candidate) => candidate.value === selection);
  if (!entry) throw new Error(`No model version key is registered for ${selection}`);
  return entry.versionKey;
}

export function formatModelAddedDate(addedOn: string | null): string {
  if (!addedOn) {
    return "Date unavailable";
  }

  const date = new Date(`${addedOn}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
