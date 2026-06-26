import {
  helpTutorialCards,
  tutorialDefinitions,
  type TutorialId,
  type TutorialStepDefinition,
} from "@/lib/tutorials/tutorialDefinitions";

export const PROFILE_TUTORIAL_FINISH_LABEL = "Back to Profile";

export const PROFILE_TUTORIAL_COMPLETION_TITLE = "Tutorial replay complete";

export const PROFILE_TUTORIAL_COMPLETION_BODY =
  "This replay used simulated data only and did not change your account.";

export const PROFILE_TUTORIAL_SECONDARY_ACTION_LABEL = "Open Help";

export const PROFILE_HELP_TITLE = "Help Tutorials";

export const PROFILE_HELP_DESCRIPTION = "Replay safe guided demos anytime.";

export function getActiveTutorialSteps(
  tutorialId: TutorialId | null,
): TutorialStepDefinition[] | null {
  return tutorialId ? tutorialDefinitions[tutorialId] : null;
}

export function getActiveTutorialTitle(tutorialId: TutorialId | null): string {
  if (!tutorialId) {
    return "Tutorial";
  }

  return helpTutorialCards.find((card) => card.id === tutorialId)?.title ?? "Tutorial";
}
