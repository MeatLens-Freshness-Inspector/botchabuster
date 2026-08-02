import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { InspectionListItem } from "../../../src/components/InspectionListItem";
import type { Inspection } from "../../../src/types/inspection";

Object.assign(globalThis, { React });

function buildInspection(overrides: Partial<Inspection> = {}): Inspection {
  return {
    id: "inspection-1",
    user_id: "user-1",
    meat_type: "pork",
    classification: "fresh",
    confidence_score: 95,
    flagged_deviations: [],
    explanation: "Looks fresh",
    image_url: null,
    location: "North Market",
    location_latitude: 14.5995,
    location_longitude: 120.9842,
    inspector_notes: null,
    created_at: "2026-08-02T10:00:00.000Z",
    updated_at: "2026-08-02T10:00:00.000Z",
    ...overrides,
  };
}

test("renders the responsive history card layout classes", () => {
  const markup = renderToStaticMarkup(
    <InspectionListItem inspection={buildInspection()} />,
  );

  assert.match(markup, /data-testid="inspection-card-layout"/);
  assert.match(markup, /grid-cols-\[auto_minmax\(0,1fr\)\]/);
  assert.match(markup, /sm:grid-cols-\[auto_minmax\(0,1fr\)_auto\]/);
  assert.match(markup, /data-testid="inspection-metrics"/);
  assert.match(markup, /col-span-2/);
  assert.match(markup, /sm:col-span-1/);
});

test("renders inline GPS coordinates in the location label", () => {
  const markup = renderToStaticMarkup(
    <InspectionListItem inspection={buildInspection()} />,
  );

  assert.match(markup, /North Market \| Lat: 14.599500 \| Long: 120.984200/);
});
