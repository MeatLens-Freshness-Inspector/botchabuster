import type {
  HelpCardDefinition,
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
  cards: HelpCardDefinition[];
  closeActiveDemo: () => void;
  navigateBack: () => void;
  openCard: (card: HelpCardDefinition) => void;
}

export interface ProfileTutorialPageViewModel {
  onFinish: () => void;
  onSkip: () => void;
  secondaryAction: TutorialSecondaryAction;
}
