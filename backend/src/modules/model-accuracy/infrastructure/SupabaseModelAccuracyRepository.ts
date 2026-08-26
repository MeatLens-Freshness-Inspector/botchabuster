import type {
  ModelAccuracyHistoryQuery,
  ModelAccuracySnapshot,
  ModelVersion,
  RegisterModelVersionInput,
} from "../domain/modelAccuracy";
import type { ModelAccuracyRepository } from "../domain/ports/ModelAccuracyRepository";

const MODEL_VERSION_COLUMNS =
  "id, version_key, display_name, expected_accuracy, active_from, retired_at, created_by, created_at";
const SNAPSHOT_COLUMNS =
  "id, model_version_id, snapshot_date, expected_accuracy, observed_accuracy, evaluated_count, correct_count, created_at, model_versions!inner(version_key, display_name)";

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
  insert(values: Record<string, unknown>): SupabaseQuery<T>;
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
    const { data, error } = await this.client.rpc<SnapshotRow[]>("capture_model_accuracy_snapshots", {
      p_snapshot_date: snapshotDate,
    });

    if (error) throw new Error(`Failed to capture model accuracy snapshots: ${error.message}`);
    if (!data?.length) return [];

    const insertedIds = new Set(data.map((row) => row.id));
    const history = await this.getHistory({ startDate: snapshotDate, endDate: snapshotDate });
    return history.filter((snapshot) => insertedIds.has(snapshot.id));
  }
}
