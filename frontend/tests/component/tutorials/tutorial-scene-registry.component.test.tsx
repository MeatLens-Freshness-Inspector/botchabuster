import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { TutorialScene, firstRunOnboardingSteps } from "../../../src/features/tutorials";

test("every first-run tutorial step resolves to a current app-tab scene", () => {
  for (const step of firstRunOnboardingSteps) {
    const expectedTab = step.tutorialId === "profile"
      ? "profile"
      : step.tutorialId === "history"
        ? "history"
        : step.tutorialId === "messages"
          ? "messages"
          : "inspect";
    const markup = renderToStaticMarkup(<TutorialScene step={step} onAdvance={() => {}} />);
    assert.match(markup, new RegExp(`data-tutorial-scene="${step.id}"`));
    assert.match(markup, /data-tutorial-app-shell/);
    assert.match(markup, new RegExp(`data-tutorial-tab="${expectedTab}"[^>]*data-active="true"`));
  }
});
