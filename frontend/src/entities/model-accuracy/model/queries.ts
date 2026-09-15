import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/entities/user";
import { modelAccuracyClient } from "../api/model-accuracy-client";

export const modelAccuracyKeys = {
  all: ["model-accuracy-history"] as const,
  history: (startDate: string, endDate: string) => ["model-accuracy-history", startDate, endDate] as const,
  calibration: (modelVersionKey: string | null, className: string | null) =>
    ["model-calibration", modelVersionKey, className] as const,
};

export function useModelAccuracyHistory(startDate: string, endDate: string) {
  const { user, isOnlineAuthenticated } = useAuth();

  return useQuery({
    queryKey: modelAccuracyKeys.history(startDate, endDate),
    networkMode: "always",
    queryFn: () => modelAccuracyClient.getHistory(startDate, endDate),
    enabled: Boolean(user?.id && isOnlineAuthenticated && startDate && endDate),
  });
}

export function useModelCalibrationAnalytics(modelVersionKey: string | null, className: string | null) {
  const { user, isOnlineAuthenticated } = useAuth();

  return useQuery({
    queryKey: modelAccuracyKeys.calibration(modelVersionKey, className),
    networkMode: "always",
    queryFn: () => modelAccuracyClient.getCalibrationAnalytics(modelVersionKey, className),
    enabled: Boolean(user?.id && isOnlineAuthenticated),
  });
}
