# Dispute Analytics Overview and PDF Export

## Goal

Keep live dispute analytics in the admin dashboard Overview tab and reserve the Reports tab for report generation and inspection summaries. Include the selected-range dispute analytics in generated admin PDF exports.

## Scope

- Remove the duplicate dispute analytics section from desktop and mobile Reports tabs.
- Keep the dedicated Disputes tab and its review/handling queue unchanged.
- Keep the existing Overview dispute analytics unchanged as the live dashboard source.
- Add selected-range dispute analytics to admin PDF exports only. CSV and JSON exports remain unchanged.

## Architecture

The existing `buildDisputeAnalytics` calculation remains the single source for both the Overview analytics and the report-scoped PDF data. `useAdminDashboard` already computes `reportDisputeAnalytics` from the selected report date range and filtered inspections.

The dashboard PDF export model will receive that report-scoped analytics object. The report adapter will translate it into a report-native section so the PDF layer does not depend on dashboard UI components.

The new PDF section, `dispute-analytics`, will contain:

- metrics for total disputes, pending, approved, rejected, and dispute rate;
- a status-distribution chart;
- a daily dispute trend chart; and
- a selected-range dispute history table with the key dispute and review fields.

All three admin organization templates will explicitly place this section after the existing report graphs and before the shared inspection summary/detail sections. Template-specific section titles will remain organization-appropriate through the existing section ordering mechanism.

## UI behavior

Desktop and mobile Reports tabs will retain date controls, inspection counts, report summaries, and PDF/CSV/JSON export actions. They will no longer import or render `ReportsDisputesSection`.

The dedicated Disputes tab will continue to provide dispute statistics and the review queue. Overview will continue to show global dispute analytics through `DisputeOverview`.

## Data and error handling

- The PDF uses the same validated report date range as the existing report export.
- Invalid date ranges remain blocked by the existing export validation.
- Empty dispute data produces a valid PDF section with zero metrics and the existing chart/table empty-state behavior.
- No API or database changes are required.

## Verification

Add or update tests to verify:

- the admin report adapter builds the dispute analytics section with metrics, charts, and rows;
- the dashboard PDF model forwards report-scoped dispute analytics;
- all organization templates retain the dispute section in the intended order; and
- Reports widget ownership no longer exposes the obsolete Reports-only dispute section while Reports tabs remain available.

Run the affected frontend unit tests first, followed by frontend lint, typecheck, build, and the CI-equivalent frontend unit/component/integration/architecture gates before claiming completion.
