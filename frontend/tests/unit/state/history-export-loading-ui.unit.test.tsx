import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { InspectionTimelineSection } from "../../../src/widgets/history/ui/inspection-timeline-section";

test("inspection history shows a blocking loading state during PDF export", () => {
  const markup = renderToStaticMarkup(
    <InspectionTimelineSection
      activeFilter="all"
      filteredCount={1}
      formattedReportDayLabel="August 26, 2026"
      hasValidReportDay
      isExportingDetailedPdf
      isLoading={false}
      pagedInspections={[]}
      safePage={1}
      searchText=""
      selectedDayCount={1}
      selectedReportDay="2026-08-26"
      totalPages={1}
      onActiveFilterChange={() => undefined}
      onExportDetailedPdf={() => undefined}
      onInspectionSelect={() => undefined}
      onNextPage={() => undefined}
      onPreviousPage={() => undefined}
      onReportDayChange={() => undefined}
      onSearchTextChange={() => undefined}
    />,
  );

  assert.match(markup, /Preparing PDF export\.\.\./);
  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /Exporting PDF/);
});
