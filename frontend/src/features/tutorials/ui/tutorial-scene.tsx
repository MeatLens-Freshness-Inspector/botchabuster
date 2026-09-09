import type { TutorialStepDefinition } from "../model/inspection-tutorial";
import React from "react";
import { SafetyMockScene } from "./scenes/safety-mock-scene";
import { ProfileMockScene } from "./scenes/profile-mock-scene";
import { InspectMockScene } from "./scenes/inspect-mock-scene";
import { HistoryMockScene } from "./scenes/history-mock-scene";
import { MessagesMockScene } from "./scenes/messages-mock-scene";

interface TutorialSceneProps {
  step: TutorialStepDefinition;
  onAdvance: () => void;
}

export function TutorialScene({ step, onAdvance }: TutorialSceneProps) {
  const renderScene = (scene: React.ReactNode) => (
    <div data-tutorial-scene={step.id} className="contents">
      {scene}
    </div>
  );

  switch (step.tutorialId) {
    case "safety":
      return renderScene(<SafetyMockScene step={step} onAdvance={onAdvance} />);
    case "profile":
      return renderScene(<ProfileMockScene step={step} onAdvance={onAdvance} />);
    case "inspect":
      return renderScene(<InspectMockScene step={step} onAdvance={onAdvance} />);
    case "history":
      return renderScene(<HistoryMockScene step={step} onAdvance={onAdvance} />);
    case "messages":
      return renderScene(<MessagesMockScene step={step} onAdvance={onAdvance} />);
    default:
      return null;
  }
}
