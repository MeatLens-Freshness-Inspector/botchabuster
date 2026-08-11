import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AnalysisResultCard } from "../../../src/components/AnalysisResultCard";
import type { AnalysisResult } from "../../../src/entities/inspection";

Object.assign(globalThis, { React });

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    classification: "fresh",
    confidence_score: 95,
    model_confidence_score: 95,
    rule_confidence_score: null,
    freshness_score: 95,
    recommendation: "Good for Consumption",
    probabilities: {
      fresh: 0.95,
      acceptable: 0.05,
    },
    label_order: ["fresh", "acceptable", "warning", "not fresh", "spoiled"],
    flagged_deviations: ["Surface moisture"],
    explanation: "Mock inspection analysis",
    analysis_source: "mobilenetv3",
    model_path: "mock-model.onnx",
    ...overrides,
  };
}

test("hides flagged deviations and source metadata when detailed results are disabled", () => {
  const markup = renderToStaticMarkup(
    <AnalysisResultCard result={buildResult()} showDetailedResults={false} />,
  );

  assert.match(markup, /Classification/);
  assert.match(markup, /Confidence/);
  assert.match(markup, /Analysis/);
  assert.doesNotMatch(markup, /Flagged Deviations/);
  assert.doesNotMatch(markup, /Source:/);
  assert.doesNotMatch(markup, /Model Output Probabilities/);
});

test("shows Ensemble as the rendered result source label", () => {
  const markup = renderToStaticMarkup(
    <AnalysisResultCard
      result={buildResult({
        confidence_score: 86,
        model_confidence_score: 86,
        freshness_score: 93,
        analysis_source: "ensemble",
        probabilities: {
          fresh: 0.75,
          acceptable: 0.09,
          warning: 0.02,
          "not fresh": 0.08,
          spoiled: 0.06,
        },
      })}
    />,
  );

  assert.match(markup, /Source: Ensemble/);
});
