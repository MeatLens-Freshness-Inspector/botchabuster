import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import { unzipSync } from "fflate";
import { assertValidCalibrationPrediction, type CalibrationImportRecord, type CalibrationPrediction } from "../domain/modelCalibration";
import type { ModelAccuracyRepository } from "../domain/ports/ModelAccuracyRepository";

const PACKAGE_SCHEMA_VERSION = "meatlens.calibration.v1";
const MAX_PACKAGE_BYTES = 50 * 1024 * 1024;
const MAX_PREDICTION_BYTES = 40 * 1024 * 1024;
const MAX_SAMPLE_COUNT = 100_000;

interface CalibrationManifest {
  schemaVersion: string;
  sampleCount: number;
  modelVersionKey?: string | null;
}

function textEntry(entry: Uint8Array, name: string): string {
  return Buffer.from(entry).toString("utf8");
}

function parseManifest(value: string): CalibrationManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Calibration manifest.json must contain valid JSON");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("Calibration manifest.json is invalid");
  const manifest = parsed as Partial<CalibrationManifest>;
  if (manifest.schemaVersion !== PACKAGE_SCHEMA_VERSION) throw new Error("Unsupported calibration package schema");
  const sampleCount = manifest.sampleCount;
  if (typeof sampleCount !== "number" || !Number.isInteger(sampleCount) || sampleCount <= 0 || sampleCount > MAX_SAMPLE_COUNT) {
    throw new Error("Calibration manifest sampleCount is invalid");
  }
  if (manifest.modelVersionKey !== undefined && manifest.modelVersionKey !== null && typeof manifest.modelVersionKey !== "string") {
    throw new Error("Calibration manifest modelVersionKey is invalid");
  }
  return {
    schemaVersion: manifest.schemaVersion,
    sampleCount,
    modelVersionKey: manifest.modelVersionKey ?? null,
  };
}

export interface ImportModelCalibrationInput {
  packagePath: string;
  importedBy: string;
}

export class ImportModelCalibration {
  constructor(private readonly repository: ModelAccuracyRepository) {}

  async execute(input: ImportModelCalibrationInput): Promise<CalibrationImportRecord> {
    const packageBytes = await fs.readFile(input.packagePath);
    if (packageBytes.length > MAX_PACKAGE_BYTES) throw new Error("Calibration package exceeds the size limit");
    const zip = unzipSync(new Uint8Array(packageBytes));
    const manifestEntry = zip["manifest.json"];
    const predictionsEntry = zip["predictions.jsonl"];
    if (!manifestEntry) throw new Error("Calibration package must include manifest.json");
    if (!predictionsEntry) throw new Error("Calibration package must include predictions.jsonl");
    const entryNames = Object.keys(zip);
    for (const name of entryNames) {
      if (name !== "manifest.json" && name !== "predictions.jsonl") {
        throw new Error(`Calibration package contains an unsupported or unsafe entry: ${name}`);
      }
    }
    if (predictionsEntry.length > MAX_PREDICTION_BYTES) throw new Error("Calibration predictions exceed the size limit");

    const manifest = parseManifest(textEntry(manifestEntry, "manifest.json"));
    const lines = textEntry(predictionsEntry, "predictions.jsonl").split(/\r?\n/).filter((line) => line.trim());
    if (lines.length !== manifest.sampleCount) throw new Error("Calibration sampleCount does not match predictions.jsonl");

    const sampleIds = new Set<string>();
    const predictions: CalibrationPrediction[] = lines.map((line, index) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        throw new Error(`Calibration prediction row ${index + 1} is invalid JSON`);
      }
      const normalized = {
        ...(parsed as object),
        modelVersionKey: (parsed as { modelVersionKey?: string | null }).modelVersionKey ?? manifest.modelVersionKey,
      };
      const prediction = assertValidCalibrationPrediction(normalized);
      if (sampleIds.has(prediction.sampleId)) throw new Error(`Calibration sample ID is duplicated: ${prediction.sampleId}`);
      sampleIds.add(prediction.sampleId);
      return prediction;
    });

    const sourceHash = createHash("sha256").update(packageBytes).digest("hex");
    return this.repository.importCalibrationPackage({
      sourceHash,
      modelVersionKey: manifest.modelVersionKey ?? null,
      predictions,
      importedBy: input.importedBy,
    });
  }
}
