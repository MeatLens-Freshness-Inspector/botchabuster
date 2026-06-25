import type { TutorialStepDefinition } from "@/lib/tutorials/tutorialDefinitions";
import { SafetyMockScene } from "@/components/tutorial/scenes/SafetyMockScene";
import { ProfileMockScene } from "@/components/tutorial/scenes/ProfileMockScene";
import { InspectMockScene } from "@/components/tutorial/scenes/InspectMockScene";
import { HistoryMockScene } from "@/components/tutorial/scenes/HistoryMockScene";

interface TutorialSceneProps {
  step: TutorialStepDefinition;
  onAdvance: () => void;
}

export function TutorialScene({ step, onAdvance }: TutorialSceneProps) {
  switch (step.tutorialId) {
    case "safety":
      return <SafetyMockScene step={step} onAdvance={onAdvance} />;
    case "profile":
      return <ProfileMockScene step={step} onAdvance={onAdvance} />;
    case "inspect":
      return <InspectMockScene step={step} onAdvance={onAdvance} />;
    case "history":
      return <HistoryMockScene step={step} onAdvance={onAdvance} />;
    default:
      return null;
  }
}
