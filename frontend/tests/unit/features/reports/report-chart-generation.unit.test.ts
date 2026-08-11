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
