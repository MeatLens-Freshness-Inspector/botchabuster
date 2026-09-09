import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { SafetyMockScene, tutorialDefinitions } from "../../../src/features/tutorials";

test("safety tutorial scene uses the shared inspector shell", () => {
  const step = tutorialDefinitions.safety[0];
  const markup = renderToStaticMarkup(<SafetyMockScene step={step} onAdvance={() => {}} />);

  assert.match(markup, /data-tutorial-app-shell/);
  assert.match(markup, /data-tutorial-tab="inspect"[^>]*data-active="true"/);
  assert.match(markup, /Official protocol still applies/);
});
