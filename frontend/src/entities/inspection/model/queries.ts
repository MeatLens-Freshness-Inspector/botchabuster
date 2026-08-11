export const inspectionKeys = {
  all: ["inspections"] as const,
  list: (userId: string, limit: number) => ["inspections", userId, limit] as const,
  detail: (userId: string, inspectionId: string) => ["inspection", userId, inspectionId] as const,
  stats: (userId: string) => ["inspection-stats", userId] as const,
  statsPrefix: ["inspection-stats"] as const,
};

export function inspectionStatsKey(userId: string): readonly [string, string] {
  return inspectionKeys.stats(userId);
}
