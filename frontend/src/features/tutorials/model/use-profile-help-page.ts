import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  helpCards,
  isTutorialId,
  type HelpCardDefinition,
} from "./profile-tutorial";
import type { ProfileHelpPageViewModel } from "./profile-tutorial-page-types";
import {
  getActiveTutorialSteps,
  getActiveTutorialTitle,
} from "./profile-tutorial-page";

export function useProfileHelpPage(): ProfileHelpPageViewModel {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const demoParam = searchParams.get("demo");
  const activeDemo = isTutorialId(demoParam) ? demoParam : null;

  const activeDemoSteps = useMemo(
    () => getActiveTutorialSteps(activeDemo),
    [activeDemo],
  );

  const openCard = (card: HelpCardDefinition) => {
    if (card.kind === "tutorial") {
      setSearchParams({ demo: card.id });
      return;
    }

    navigate(card.href);
  };

  return {
    activeDemo,
    activeDemoSteps,
    activeDemoTitle: getActiveTutorialTitle(activeDemo),
    cards: helpCards,
    closeActiveDemo: () => setSearchParams({}),
    navigateBack: () => navigate("/profile"),
    openCard,
  };
}
