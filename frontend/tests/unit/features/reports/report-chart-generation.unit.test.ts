import assert from "node:assert/strict";
import test from "node:test";

import { buildReportChartSvg } from "../../../../src/features/reports/lib/pdf/report-charts";

test("report chart generation returns no SVG for empty data", () => {
  const svg = buildReportChartSvg(
    {
      id: "empty",
      title: "Empty",
      kind: "bar",
      points: [],
      emptyState: "No data",
    },
    { sectionColor: "#111827", bodyColor: "#334155" }
  );

  assert.equal(svg, null);
});

test("report line charts render every supplied series and a shared legend", () => {
  const svg = buildReportChartSvg(
    {
      id: "accuracy-history",
      title: "Historical Model Accuracy",
      kind: "line",
      points: [],
      series: [
        {
          name: "Expected Accuracy",
          color: "#2563EB",
          points: [
            { label: "2026-08-25", value: 0.92 },
            { label: "2026-08-26", value: 0.92 },
          ],
        },
        {
          name: "Observed Accuracy",
          color: "#16A34A",
          points: [{ label: "2026-08-25", value: 0.875 }],
        },
      ],
      emptyState: "No data",
    },
    { sectionColor: "#111827", bodyColor: "#334155" },
  );

  assert.ok(svg);
  assert.match(svg, /Expected Accuracy/);
  assert.match(svg, /Observed Accuracy/);
  assert.equal((svg.match(/<polyline/g) ?? []).length, 2);
  assert.match(svg, /#2563EB/);
  assert.match(svg, /#16A34A/);
});
