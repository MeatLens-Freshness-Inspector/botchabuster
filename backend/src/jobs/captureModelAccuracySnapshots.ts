import { supabase } from "../integrations/supabase";

interface SnapshotRpcClient {
  rpc<T = unknown>(functionName: string, args?: Record<string, unknown>): PromiseLike<{
    data: T | null;
    error: { message: string } | null;
  }>;
}

export function getPreviousUtcDate(now: Date = new Date()): string {
  return new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
}

export async function captureModelAccuracySnapshots(
  client: SnapshotRpcClient = supabase,
  now: Date = new Date(),
): Promise<{ snapshotDate: string; insertedCount: number }> {
  const snapshotDate = getPreviousUtcDate(now);
  const { data, error } = await client.rpc<Array<{ id: string }>>(
    "capture_model_accuracy_snapshots",
    { p_snapshot_date: snapshotDate },
  );

  if (error) throw new Error(`Model accuracy snapshot capture failed: ${error.message}`);
  return { snapshotDate, insertedCount: data?.length ?? 0 };
}

if (require.main === module) {
  void captureModelAccuracySnapshots()
    .then(({ snapshotDate, insertedCount }) => {
      console.info(`Captured ${insertedCount} model accuracy snapshots for ${snapshotDate}`);
    })
    .catch((error: unknown) => {
      console.error("Model accuracy snapshot job failed:", error);
      process.exitCode = 1;
    });
}
