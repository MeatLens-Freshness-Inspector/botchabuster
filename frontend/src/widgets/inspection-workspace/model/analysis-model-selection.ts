import {
  PRIMARY_ANALYSIS_MODEL,
  type AnalysisModelSelection,
} from "@/features/offline-analysis";

type WorkspaceUser = { id: string } | null;

export function resolveInspectionModelSelection(
  user: WorkspaceUser,
  isAdmin: boolean,
  isDeveloper: boolean,
  isDeveloperUnlocked: boolean,
  selectedModel: AnalysisModelSelection,
): AnalysisModelSelection {
  if (!user || !isAdmin || !isDeveloper || !isDeveloperUnlocked) {
    return PRIMARY_ANALYSIS_MODEL;
  }

  return selectedModel;
}
