import type {
  ModelAccuracyHistoryQuery,
  ModelAccuracySnapshot,
  ModelVersion,
  RegisterModelVersionInput,
} from "../domain/modelAccuracy";
import type {
  CalibrationAnalyticsQuery,
  CalibrationImportRecord,
  CalibrationPrediction,
  FieldConfidenceObservation,
} from "../domain/modelCalibration";
import type {
  CalibrationRepositoryInputs,
  ImportCalibrationPackageInput,
  ModelAccuracyRepository,
} from "../domain/ports/ModelAccuracyRepository";

const MODEL_VERSION_COLUMNS =
  "id, version_key, display_name, expected_accuracy, active_from, retired_at, created_by, created_at";
const SNAPSHOT_COLUMNS =
  "id, model_version_id, snapshot_date, expected_accuracy, observed_accuracy, evaluated_count, correct_count, created_at, model_versions!inner(version_key, display_name)";
const CALIBRATION_IMPORT_COLUMNS = "id, source_hash, model_version_key, sample_count, imported_by, imported_at";
const CALIBRATION_SAMPLE_COLUMNS = "sample_id, ground_truth, predicted_class, confidence, probabilities, model_version_key";
const FIELD_OBSERVATION_COLUMNS =
  "id, classification, confidence_score, model_version_id, model_versions(version_key), inspection_result_disputes(status, created_at, reviewed_at, expected_classification)";

interface SupabaseError {
  code?: string;
  message: string;
}

interface SupabaseResult<T> {
  data: T | null;
  error: SupabaseError | null;
}

interface SupabaseQuery<T = unknown> extends PromiseLike<SupabaseResult<T>> {
  select(columns: string): SupabaseQuery<T>;
  insert(values: Record<string, unknown> | Array<Record<string, unknown>>): SupabaseQuery<T>;
  eq(column: string, value: string): SupabaseQuery<T>;
  gte(column: string, value: string): SupabaseQuery<T>;
  lte(column: string, value: string): SupabaseQuery<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseQuery<T>;
  single(): SupabaseQuery<T>;
}

interface SupabaseModelAccuracyClient {
  from(table: string): SupabaseQuery;
  rpc<T = unknown>(functionName: string, args?: Record<string, unknown>): PromiseLike<SupabaseResult<T>>;
}

type SnapshotRow = {
  id: string;
  model_version_id: string;
  snapshot_date: string;
  expected_accuracy: number | string;
  observed_accuracy: number | string | null;
  evaluated_count: number | string;
  correct_count: number | string;
  created_at: string;
  model_versions?: { version_key?: string; display_name?: string } | Array<{ version_key?: string; display_name?: string }>;
};

type ModelVersionRow = {
  id: string;
  version_key: string;
  display_name: string;
  expected_accuracy: number | string;
  active_from: string;
  retired_at: string | null;
  created_by: string | null;
  created_at: string;
};

type CalibrationImportRow = {
  id: string;
  source_hash: string;
  model_version_key: string | null;
  sample_count: number | string;
  imported_by: string;
  imported_at: string;
};

type CalibrationSampleRow = {
  sample_id: string;
  ground_truth: string;
  predicted_class: string;
  confidence: number | string;
  probabilities: Record<string, number>;
  model_version_key: string | null;
};

type FieldDisputeRow = {
  status?: string;
  created_at?: string;
  reviewed_at?: string | null;
  expected_classification?: string | null;
};

type FieldObservationRow = {
  id: string;
  classification: string;
  confidence_score: number | string;
  model_versions?: { version_key?: string } | Array<{ version_key?: string }>;
  inspection_result_disputes?: FieldDisputeRow | FieldDisputeRow[];
};

function numberValue(value: number | string | null, field: string): number | null {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Model accuracy field ${field} is invalid`);
  return parsed;
}

function requiredNumber(value: number | string, field: string): number {
  const parsed = numberValue(value, field);
  if (parsed === null) throw new Error(`Model accuracy field ${field} is missing`);
  return parsed;
}

function joinedModelVersion(row: SnapshotRow): { versionKey: string; displayName: string } {
  const joined = Array.isArray(row.model_versions) ? row.model_versions[0] : row.model_versions;
  if (!joined?.version_key || !joined.display_name) {
    throw new Error("Model accuracy snapshot model version is missing");
  }

  return { versionKey: joined.version_key, displayName: joined.display_name };
}

function mapModelVersion(row: ModelVersionRow): ModelVersion {
  return {
    id: row.id,
    versionKey: row.version_key,
    displayName: row.display_name,
    expectedAccuracy: requiredNumber(row.expected_accuracy, "expected_accuracy"),
    activeFrom: row.active_from,
    retiredAt: row.retired_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function mapSnapshot(row: SnapshotRow): ModelAccuracySnapshot {
  const modelVersion = joinedModelVersion(row);
  return {
    id: row.id,
    modelVersionId: row.model_version_id,
    ...modelVersion,
    snapshotDate: row.snapshot_date,
    expectedAccuracy: requiredNumber(row.expected_accuracy, "expected_accuracy"),
    observedAccuracy: numberValue(row.observed_accuracy, "observed_accuracy"),
    evaluatedCount: requiredNumber(row.evaluated_count, "evaluated_count"),
    correctCount: requiredNumber(row.correct_count, "correct_count"),
    createdAt: row.created_at,
  };
}

function mapCalibrationImport(row: CalibrationImportRow): CalibrationImportRecord {
  return {
    id: row.id,
    sourceHash: row.source_hash,
    modelVersionKey: row.model_version_key,
    sampleCount: requiredNumber(row.sample_count, "sample_count"),
    importedBy: row.imported_by,
    importedAt: row.imported_at,
  };
}

function mapCalibrationSample(row: CalibrationSampleRow): CalibrationPrediction {
  return {
    sampleId: row.sample_id,
    groundTruth: row.ground_truth,
    predictedClass: row.predicted_class,
    confidence: requiredNumber(row.confidence, "confidence"),
    probabilities: row.probabilities,
    modelVersionKey: row.model_version_key,
  };
}

function joinedVersionKey(row: FieldObservationRow): string | null {
  const joined = Array.isArray(row.model_versions) ? row.model_versions[0] : row.model_versions;
  return joined?.version_key ?? null;
}

function firstDispute(row: FieldObservationRow): FieldDisputeRow | null {
  const dispute = Array.isArray(row.inspection_result_disputes)
    ? row.inspection_result_disputes[0]
    : row.inspection_result_disputes;
  return dispute ?? null;
}

function mapFieldObservation(row: FieldObservationRow): FieldConfidenceObservation {
  const dispute = firstDispute(row);
  const status = dispute?.status;
  const disputeStatus = status === "pending" || status === "approved" || status === "rejected" ? status : "none";
  return {
    inspectionId: row.id,
    originalPrediction: row.classification,
    originalConfidence: requiredNumber(row.confidence_score, "confidence_score"),
    disputeStatus,
    disputeDate: dispute?.created_at ?? null,
    resolutionDate: dispute?.reviewed_at ?? null,
    disputeResult: dispute?.expected_classification ?? null,
    modelVersionKey: joinedVersionKey(row),
  };
}

export class SupabaseModelAccuracyRepository implements ModelAccuracyRepository {
  constructor(private readonly client: SupabaseModelAccuracyClient) {}

  async registerModelVersion(input: RegisterModelVersionInput): Promise<ModelVersion> {
    const { data, error } = await this.client
      .from("model_versions")
      .insert({
        version_key: input.versionKey,
        display_name: input.displayName,
        expected_accuracy: input.expectedAccuracy,
        active_from: input.activeFrom,
        created_by: input.createdBy,
      })
      .select(MODEL_VERSION_COLUMNS)
      .single() as SupabaseResult<ModelVersionRow>;

    if (error?.code === "23505") {
      throw new Error("Model version key already exists");
    }
    if (error) throw new Error(`Failed to register model version: ${error.message}`);
    if (!data) throw new Error("Registered model version response is missing");

    return mapModelVersion(data);
  }

  async getHistory(query: ModelAccuracyHistoryQuery): Promise<ModelAccuracySnapshot[]> {
    const { data, error } = await this.client
      .from("model_accuracy_snapshots")
      .select(SNAPSHOT_COLUMNS)
      .gte("snapshot_date", query.startDate)
      .lte("snapshot_date", query.endDate)
      .order("snapshot_date", { ascending: true })
      .order("model_version_id", { ascending: true }) as SupabaseResult<SnapshotRow[]>;

    if (error) throw new Error(`Failed to fetch model accuracy history: ${error.message}`);

    return (data ?? [])
      .map(mapSnapshot)
      .sort((left, right) =>
        left.snapshotDate.localeCompare(right.snapshotDate) || left.versionKey.localeCompare(right.versionKey),
      );
  }

  async captureSnapshots(snapshotDate: string): Promise<ModelAccuracySnapshot[]> {
    const { error } = await this.client.rpc<SnapshotRow[]>("capture_model_accuracy_snapshots", {
      p_snapshot_date: snapshotDate,
    });

    if (error) throw new Error(`Failed to capture model accuracy snapshots: ${error.message}`);
    return this.getHistory({ startDate: snapshotDate, endDate: snapshotDate });
  }

  async importCalibrationPackage(input: ImportCalibrationPackageInput): Promise<CalibrationImportRecord> {
    const { data, error } = await this.client
      .from("model_calibration_imports")
      .insert({
        source_hash: input.sourceHash,
        model_version_key: input.modelVersionKey,
        sample_count: input.predictions.length,
        imported_by: input.importedBy,
      })
      .select(CALIBRATION_IMPORT_COLUMNS)
      .single() as SupabaseResult<CalibrationImportRow>;

    if (error?.code === "23505") throw new Error("Calibration package has already been imported");
    if (error) throw new Error(`Failed to store calibration import: ${error.message}`);
    if (!data) throw new Error("Calibration import response is missing");

    const imported = mapCalibrationImport(data);
    const { error: sampleError } = await this.client
      .from("model_calibration_samples")
      .insert(input.predictions.map((prediction) => ({
        import_id: imported.id,
        sample_id: prediction.sampleId,
        ground_truth: prediction.groundTruth,
        predicted_class: prediction.predictedClass,
        confidence: prediction.confidence,
        probabilities: prediction.probabilities,
        model_version_key: prediction.modelVersionKey ?? input.modelVersionKey,
      })));
    if (sampleError) throw new Error(`Failed to store calibration samples: ${sampleError.message}`);

    return imported;
  }

  async getCalibrationInputs(query: CalibrationAnalyticsQuery): Promise<CalibrationRepositoryInputs> {
    let sampleQuery = this.client.from("model_calibration_samples").select(CALIBRATION_SAMPLE_COLUMNS);
    if (query.modelVersionKey) sampleQuery = sampleQuery.eq("model_version_key", query.modelVersionKey);
    const [samplesResult, fieldResult, classesResult, modelsResult] = await Promise.all([
      sampleQuery as PromiseLike<SupabaseResult<CalibrationSampleRow[]>>,
      this.client.from("inspections").select(FIELD_OBSERVATION_COLUMNS) as PromiseLike<SupabaseResult<FieldObservationRow[]>>,
      this.client.from("model_calibration_samples").select("ground_truth, predicted_class") as PromiseLike<SupabaseResult<Array<{ ground_truth: string; predicted_class: string }>>>,
      this.client.from("model_versions").select("version_key, display_name") as PromiseLike<SupabaseResult<Array<{ version_key: string; display_name: string }>>>,
    ]);

    if (samplesResult.error) throw new Error(`Failed to fetch calibration samples: ${samplesResult.error.message}`);
    if (fieldResult.error) throw new Error(`Failed to fetch field confidence observations: ${fieldResult.error.message}`);
    if (classesResult.error) throw new Error(`Failed to fetch calibration classes: ${classesResult.error.message}`);
    if (modelsResult.error) throw new Error(`Failed to fetch calibration model versions: ${modelsResult.error.message}`);

    const fieldObservations = (fieldResult.data ?? [])
      .filter((row) => !query.modelVersionKey || joinedVersionKey(row) === query.modelVersionKey)
      .map(mapFieldObservation);
    const availableClasses = Array.from(new Set((classesResult.data ?? []).flatMap((row) => [row.ground_truth, row.predicted_class]))).sort();
    return {
      predictions: (samplesResult.data ?? []).map(mapCalibrationSample),
      fieldObservations,
      availableClasses,
      availableModelVersions: (modelsResult.data ?? [])
        .map((row) => ({ versionKey: row.version_key, displayName: row.display_name }))
        .sort((left, right) => left.versionKey.localeCompare(right.versionKey)),
    };
  }
}
