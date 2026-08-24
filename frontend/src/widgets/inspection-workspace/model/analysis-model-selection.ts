import type { AnalysisModelSelection } from "@/features/offline-analysis";

type WorkspaceUser = { id: string } | null;

export function resolveInspectionModelSelection(
  user: WorkspaceUser,
  isAdmin: boolean,
  isDeveloperUnlocked: boolean,
  selectedModel: AnalysisModelSelection,
): AnalysisModelSelection {
  if (!user || !isAdmin || !isDeveloperUnlocked) {
    return "primary";
  }

  return selectedModel;
}
