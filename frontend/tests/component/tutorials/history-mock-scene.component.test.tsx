import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { HistoryMockScene, tutorialDefinitions, tutorialFixtures } from "../../../src/features/tutorials";

test("history tutorial mirrors the saved record and detail review", () => {
  const markup = renderToStaticMarkup(
    <HistoryMockScene step={tutorialDefinitions.history[0]} onAdvance={() => {}} />,
  );

  assert.match(markup, /data-tutorial-tab="history"[^>]*data-active="true"/);
  assert.match(markup, new RegExp(tutorialFixtures.history.recordLabel));
  assert.match(markup, /confidence/);
  assert.match(markup, /Saved inspections keep their classification/);
});
