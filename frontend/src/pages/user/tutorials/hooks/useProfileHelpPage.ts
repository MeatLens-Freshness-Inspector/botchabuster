import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  helpTutorialCards,
  isTutorialId,
  type TutorialId,
} from "@/lib/tutorials/tutorialDefinitions";
import type { ProfileHelpPageViewModel } from "../types";
import {
  getActiveTutorialSteps,
  getActiveTutorialTitle,
} from "../utils/tutorialPages";

export function useProfileHelpPage(): ProfileHelpPageViewModel {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const demoParam = searchParams.get("demo");
  const activeDemo = isTutorialId(demoParam) ? demoParam : null;

  const activeDemoSteps = useMemo(
    () => getActiveTutorialSteps(activeDemo),
    [activeDemo],
  );

  return {
    activeDemo,
    activeDemoSteps,
    activeDemoTitle: getActiveTutorialTitle(activeDemo),
    cards: helpTutorialCards,
    closeActiveDemo: () => setSearchParams({}),
    navigateBack: () => navigate("/profile"),
    openDemo: (tutorialId: TutorialId) => setSearchParams({ demo: tutorialId }),
  };
}
