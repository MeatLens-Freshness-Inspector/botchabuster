import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";

import {
  TutorialPlayer,
  TutorialScene,
  firstRunOnboardingSteps,
} from "../../../../src/features/tutorials";

test("tutorial feature publishes player and scene components", () => {
  assert.equal(typeof TutorialPlayer, "function");
  assert.equal(typeof TutorialScene, "function");
});

test("tutorial player keeps the outer page scrollable on mobile-sized layouts", () => {
  const markup = renderToStaticMarkup(
    <TutorialPlayer
      steps={firstRunOnboardingSteps.slice(0, 1)}
      finishLabel="Start Inspecting"
      completionTitle="Tutorial complete"
      completionBody="Simulated tutorial"
      onFinish={() => undefined}
    />,
  );

  assert.match(markup, /data-tutorial-player/);
  assert.match(markup, /min-h-\[100dvh\]/);
  assert.match(markup, /overflow-x-hidden/);
  assert.match(markup, /pb-\[calc\(6rem\+env\(safe-area-inset-bottom,0px\)\)\]/);
  assert.match(markup, /data-tutorial-progress/);
  assert.match(markup, /motion-safe:animate-ping/);
  assert.match(markup, /data-tutorial-phone-frame/);
});
