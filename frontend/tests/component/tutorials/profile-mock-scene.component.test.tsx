import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { ProfileMockScene, tutorialDefinitions, tutorialFixtures } from "../../../src/features/tutorials";

test("profile tutorial uses the current account surface and deterministic fixture copy", () => {
  const markup = renderToStaticMarkup(
    <ProfileMockScene step={tutorialDefinitions.profile[0]} onAdvance={() => {}} />,
  );

  assert.match(markup, /data-tutorial-tab="profile"[^>]*data-active="true"/);
  assert.match(markup, new RegExp(tutorialFixtures.profile.displayName));
  assert.match(markup, /Help Tutorials/);
  assert.doesNotMatch(markup, /Juan Dela Cruz|juan@botchabuster/);
});
