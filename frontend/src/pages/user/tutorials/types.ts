import type {
  HelpTutorialCardDefinition,
  TutorialId,
  TutorialStepDefinition,
} from "@/lib/tutorials/tutorialDefinitions";

export interface TutorialSecondaryAction {
  label: string;
  onClick: () => void;
}

export interface ProfileHelpPageViewModel {
  activeDemo: TutorialId | null;
  activeDemoSteps: TutorialStepDefinition[] | null;
  activeDemoTitle: string;
  cards: HelpTutorialCardDefinition[];
  closeActiveDemo: () => void;
  navigateBack: () => void;
  openDemo: (tutorialId: TutorialId) => void;
}

export interface ProfileTutorialPageViewModel {
  onFinish: () => void;
  onSkip: () => void;
  secondaryAction: TutorialSecondaryAction;
}
