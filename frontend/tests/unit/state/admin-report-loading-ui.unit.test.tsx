import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import ReportsTab from "../../../src/widgets/admin-dashboard/ui/reports-tab";
import MobileReportsTab from "../../../src/widgets/admin-dashboard/ui/mobile-reports-tab";
import type { AdminDashboardPageViewModel } from "../../../src/widgets/admin-dashboard";

function createDashboard(activeReportExport: "pdf" | "csv" | "json" | null): AdminDashboardPageViewModel {
  return {
    activeReportExport,
    reportStartDate: "2026-08-01",
    reportEndDate: "2026-08-26",
    reportDateRangeInvalid: false,
    reportRows: [{ id: "inspection-1" }],
    reportSummary: { total: 1, averageConfidence: 94, spoiledRate: 0 },
    reportClassCounts: { fresh: 1 },
    setReportStartDate: () => undefined,
    setReportEndDate: () => undefined,
    handleExportPDF: async () => undefined,
    handleExportCSV: async () => undefined,
    handleExportJSON: async () => undefined,
  } as unknown as AdminDashboardPageViewModel;
}

test("desktop reports show a blocking loading state for the active export", () => {
  const markup = renderToStaticMarkup(<ReportsTab dashboard={createDashboard("pdf")} />);

  assert.match(markup, /Preparing PDF export\.\.\./);
  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /disabled=""/);
});

test("mobile reports show the same loading state for the active export", () => {
  const markup = renderToStaticMarkup(<MobileReportsTab dashboard={createDashboard("json")} />);

  assert.match(markup, /Preparing JSON export\.\.\./);
  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /disabled=""/);
});
