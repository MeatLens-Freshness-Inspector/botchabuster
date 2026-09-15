import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { strToU8, zipSync } from "fflate";
import { ImportModelCalibration } from "../../../src/modules/model-accuracy/application/ImportModelCalibration";
import type { CalibrationImportRecord, CalibrationPrediction } from "../../../src/modules/model-accuracy/domain/modelCalibration";
import type { ModelAccuracyRepository } from "../../../src/modules/model-accuracy/domain/ports/ModelAccuracyRepository";

const prediction: CalibrationPrediction = {
  sampleId: "sample-1",
  groundTruth: "fresh",
  predictedClass: "fresh",
  confidence: 0.8,
  probabilities: { fresh: 0.8, spoiled: 0.2 },
};

function fakeRepository() {
  let received: CalibrationPrediction[] = [];
  const repository = {
    registerModelVersion: async () => { throw new Error("unused"); },
    getHistory: async () => [],
    captureSnapshots: async () => [],
    importCalibrationPackage: async (input: { sourceHash: string; modelVersionKey: string | null; predictions: CalibrationPrediction[]; importedBy: string }) => {
      received = input.predictions;
      return {
        id: "import-1",
        sourceHash: input.sourceHash,
        modelVersionKey: input.modelVersionKey,
        sampleCount: input.predictions.length,
        importedBy: input.importedBy,
        importedAt: "2026-09-15T00:00:00.000Z",
      } satisfies CalibrationImportRecord;
    },
    getCalibrationInputs: async () => ({ predictions: [], fieldObservations: [], availableClasses: [], availableModelVersions: [] }),
  } satisfies ModelAccuracyRepository;
  return { repository, getReceived: () => received };
}

async function createPackage(entries: Record<string, string>): Promise<{ directory: string; filePath: string }> {
  const directory = await mkdtemp(path.join(tmpdir(), "model-calibration-import-"));
  const filePath = path.join(directory, "calibration-package.zip");
  await writeFile(filePath, Buffer.from(zipSync(Object.fromEntries(Object.entries(entries).map(([name, value]) => [name, strToU8(value)])))));
  return { directory, filePath };
}

function manifest(sampleCount: number, modelVersionKey = "model-a"): string {
  return JSON.stringify({ schemaVersion: "meatlens.calibration.v1", sampleCount, modelVersionKey, split: "held-out" });
}

test("calibration import rejects packages without manifest or predictions", async () => {
  const { directory, filePath } = await createPackage({ "notes.txt": "not calibration data" });
  try {
    const importer = new ImportModelCalibration(fakeRepository().repository);
    await assert.rejects(() => importer.execute({ packagePath: filePath, importedBy: "admin-1" }), /manifest\.json/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("calibration import validates schema, row count, duplicate IDs, and unsafe entries", async () => {
  const cases = [
    { entries: { "manifest.json": JSON.stringify({ schemaVersion: "v0", sampleCount: 1 }), "predictions.jsonl": JSON.stringify(prediction) }, error: /schema/i },
    { entries: { "manifest.json": manifest(2), "predictions.jsonl": JSON.stringify(prediction) }, error: /sampleCount|row count/i },
    { entries: { "manifest.json": manifest(2), "predictions.jsonl": `${JSON.stringify(prediction)}\n${JSON.stringify(prediction)}` }, error: /duplicate/i },
    { entries: { "manifest.json": manifest(1), "predictions.jsonl": JSON.stringify(prediction), "../escape.txt": "unsafe" }, error: /entry|path|unsafe/i },
  ];

  for (const testCase of cases) {
    const { directory, filePath } = await createPackage(testCase.entries);
    try {
      await assert.rejects(
        () => new ImportModelCalibration(fakeRepository().repository).execute({ packagePath: filePath, importedBy: "admin-1" }),
        testCase.error,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
});

test("calibration import normalizes manifest provenance and sends only labeled rows to the repository", async () => {
  const { directory, filePath } = await createPackage({
    "manifest.json": manifest(1, "model-a"),
    "predictions.jsonl": JSON.stringify(prediction),
  });
  try {
    const fake = fakeRepository();
    const result = await new ImportModelCalibration(fake.repository).execute({ packagePath: filePath, importedBy: "admin-1" });
    assert.equal(result.sampleCount, 1);
    assert.equal(result.modelVersionKey, "model-a");
    assert.equal(fake.getReceived()[0].modelVersionKey, "model-a");
    assert.equal(result.sourceHash.length, 64);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
