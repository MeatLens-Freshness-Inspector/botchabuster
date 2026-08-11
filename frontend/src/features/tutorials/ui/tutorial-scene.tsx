import type { TutorialStepDefinition } from "../model/inspection-tutorial";
import { SafetyMockScene } from "./scenes/safety-mock-scene";
import { ProfileMockScene } from "./scenes/profile-mock-scene";
import { InspectMockScene } from "./scenes/inspect-mock-scene";
import { HistoryMockScene } from "./scenes/history-mock-scene";

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
