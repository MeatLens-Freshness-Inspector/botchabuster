import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/entities/user";
import { inspectionClient, inspectionKeys } from "@/entities/inspection";
import { API_REQUEST_TIMEOUT_MESSAGE } from "@/shared/api";
import {
  buildInspectionHistoryStats,
  getCachedInspection,
  getCachedInspectionList,
  getCachedInspectionStats,
  setCachedInspectionList,
  setCachedInspectionStats,
  upsertCachedInspection,
} from "@/lib/inspectionHistoryCache";
import type { InspectionInsert } from "@/entities/inspection";

function isTransportFailure(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }

  return error instanceof Error && error.message === API_REQUEST_TIMEOUT_MESSAGE;
}

export function useInspections(limit = 50) {
  const { user, isOnlineAuthenticated } = useAuth();

  return useQuery({
    queryKey: inspectionKeys.list(user?.id ?? "anonymous", limit),
    networkMode: "always",
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      if (!isOnlineAuthenticated) {
        const cachedInspections = await getCachedInspectionList(user.id);
        return cachedInspections?.slice(0, limit) ?? [];
      }

      try {
        const inspections = await inspectionClient.getAll(limit);
        void setCachedInspectionList(user.id, inspections);
        void setCachedInspectionStats(user.id, buildInspectionHistoryStats(inspections));
        return inspections;
      } catch (error) {
        if (!isTransportFailure(error)) {
          throw error;
        }

        const cachedInspections = await getCachedInspectionList(user.id);
        return cachedInspections?.slice(0, limit) ?? [];
      }
    },
    enabled: !!user?.id,
  });
}

export function useInspection(id: string) {
  const { user, isOnlineAuthenticated } = useAuth();

  return useQuery({
    queryKey: inspectionKeys.detail(user?.id ?? "anonymous", id),
    networkMode: "always",
    queryFn: async () => {
      if (!user?.id || !id) {
        return null;
      }

      if (!isOnlineAuthenticated) {
        return getCachedInspection(user.id, id);
      }

      try {
        const inspection = await inspectionClient.getById(id);
        if (inspection) {
          void upsertCachedInspection(user.id, inspection);
        }
        return inspection;
      } catch (error) {
        if (!isTransportFailure(error)) {
          throw error;
        }

        return getCachedInspection(user.id, id);
      }
    },
    enabled: !!user?.id && !!id,
  });
}

export function useCreateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InspectionInsert) => inspectionClient.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
      queryClient.invalidateQueries({ queryKey: inspectionKeys.statsPrefix });
    },
  });
}

export function useDeleteInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inspectionClient.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
      queryClient.invalidateQueries({ queryKey: inspectionKeys.statsPrefix });
    },
  });
}

export function useInspectionStats() {
  const { user, isOnlineAuthenticated } = useAuth();

  return useQuery({
    queryKey: inspectionKeys.stats(user?.id ?? "anonymous"),
    networkMode: "always",
    queryFn: async () => {
      if (!user?.id) {
        return {
          total: 0,
          byClassification: {},
        };
      }

      if (!isOnlineAuthenticated) {
        const cachedStats = await getCachedInspectionStats(user.id);
        if (cachedStats) {
          return cachedStats;
        }

        const cachedInspections = await getCachedInspectionList(user.id);
        return cachedInspections
          ? buildInspectionHistoryStats(cachedInspections)
          : { total: 0, byClassification: {} };
      }

      try {
        const stats = await inspectionClient.getStatistics();
        void setCachedInspectionStats(user.id, {
          total: stats.total,
          byClassification: {
            fresh: stats.byClassification.fresh ?? 0,
            "not fresh": stats.byClassification["not fresh"] ?? 0,
            acceptable: stats.byClassification.acceptable ?? 0,
            warning: stats.byClassification.warning ?? 0,
            spoiled: stats.byClassification.spoiled ?? 0,
          },
        });
        return stats;
      } catch (error) {
        if (!isTransportFailure(error)) {
          throw error;
        }

        const cachedStats = await getCachedInspectionStats(user.id);
        if (cachedStats) {
          return cachedStats;
        }

        const cachedInspections = await getCachedInspectionList(user.id);
        return cachedInspections
          ? buildInspectionHistoryStats(cachedInspections)
          : { total: 0, byClassification: {} };
      }
    },
    enabled: !!user?.id,
  });
}
