import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { InspectMockScene, tutorialDefinitions, tutorialFixtures } from "../../../src/features/tutorials";

test("inspect tutorial mirrors scope, pre-scan, GPS, model, and analysis surfaces", () => {
  const prescanStep = tutorialDefinitions.inspect.find((step) => step.id === "inspect-prescan");
  assert.ok(prescanStep);
  const markup = renderToStaticMarkup(<InspectMockScene step={prescanStep} onAdvance={() => {}} />);

  assert.match(markup, /data-tutorial-tab="inspect"[^>]*data-active="true"/);
  assert.match(markup, /Pre-Scan Safety Protocol/);
  assert.match(markup, new RegExp(tutorialFixtures.inspect.gpsStatus));
  assert.match(markup, /Certificate Proof/);
});

test("inspect market step exposes the live selector affordance", () => {
  const marketStep = tutorialDefinitions.inspect.find((step) => step.id === "inspect-market");
  assert.ok(marketStep);
  const markup = renderToStaticMarkup(<InspectMockScene step={marketStep} onAdvance={() => {}} />);

  assert.match(markup, /data-tutorial-market-selector/);
  assert.match(markup, /aria-label="Select market location"/);
  assert.match(markup, /Choose market/);
  assert.match(markup, /Saved to report:/);
});
