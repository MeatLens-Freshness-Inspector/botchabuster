# Dispute Statistics Across the Admin Dashboard

## Status

Approved design for implementation.

## Problem

The admin dashboard can currently review pending inspection-result disputes, but it cannot show complete dispute history or aggregate dispute activity. The overview, reports, and disputes tabs need a consistent view of dispute volume and status.

## Goals

- Make the complete admin-visible dispute history available to the dashboard.
- Show comprehensive dispute statistics on Overview.
- Show dispute statistics, graphs, and a complete date-filtered dispute-history table on Reports.
- Make the Disputes tab a numbers-only KPI surface containing total disputes, pending, approved, rejected, and dispute rate versus inspections.
- Keep desktop and mobile dashboard behavior consistent.
- Preserve existing review APIs and existing inspection/report behavior outside the requested surfaces.

## Non-goals

- Adding new dispute workflow states or changing review business rules.
- Changing how inspectors submit disputes.
- Adding server-side pagination or a separate analytics warehouse in this iteration.
- Adding dispute records to PDF, CSV, or JSON exports unless an existing export contract must be updated to keep types/builds valid.

## Recommended approach

Add one admin-protected read endpoint for all dispute records, fetch it with the existing admin dashboard bootstrap, and derive all display metrics from that shared state in the frontend. This keeps Overview, Reports, and the Disputes tab aligned without duplicating network calls or introducing a second analytics API.

The existing pending-review endpoint remains available for the existing review workflow/API clients. The new history endpoint is read-only and does not alter dispute review or developer-label mutation behavior.

## Backend design

### API

Add `GET /developer-dashboard/disputes/history`, protected by `requireAdmin`.

The response is an array of `InspectionResultDisputeRecord`-compatible objects, including the related inspection already returned by the dispute service. Records are ordered newest first by `created_at`, then by `id`, and include every persisted status (`pending`, `approved`, and `rejected`). The query has no status filter and the dashboard does not truncate the returned history.

Add a repository/service method dedicated to all-history reads rather than changing the pending-only method. The controller delegates to a list-all application use case. The existing `GET /developer-dashboard/disputes` pending queue and mutation routes remain unchanged.

### Frontend client

Add a `listInspectionResultDisputeHistory()` client method for the new endpoint. Keep the existing `listInspectionResultDisputes()` method for the pending review queue so callers retain explicit semantics.

## Frontend data and analytics design

### Shared state

Extend the admin dashboard view model with `disputes` and derived `disputeAnalytics`. During the existing `loadData` bootstrap, fetch dispute history in parallel with profiles, inspections, stats, codes, markets, and developer overview data. A failed dispute-history request uses the dashboard’s existing error toast/loading behavior and does not silently substitute fabricated data.

Create one pure analytics boundary for the shared calculations. It will derive:

- `total`: number of dispute records.
- `pending`, `approved`, and `rejected`: status counts.
- `disputeRate`: percentage of inspections represented by at least one dispute, calculated as unique disputed inspection IDs divided by inspections in scope, rounded to the nearest whole percent; zero when there are no inspections.
- `statusDistribution`: status/count rows in a stable pending, approved, rejected order.
- `dailyTrend`: date/count rows for the report range or the overview’s recent window, with one row per day represented in the source data.
- `filteredDisputes`: dispute records filtered by `created_at` using the same inclusive local-day semantics as inspection reports.

The analytics layer must tolerate empty arrays, invalid timestamps, and missing related inspection data. Labels should use existing status/classification formatters and existing dashboard date formatting conventions.

## Overview tab

Add a dedicated dispute-statistics section to the existing overview composition. It will show:

- KPI cards for total disputes, pending, approved, rejected, and dispute rate.
- A status-distribution graph so the overall resolution mix is visible at a glance.
- A daily dispute trend graph over the same recent overview window used by the dashboard’s operational charts.

The section has a clear empty state when no disputes exist. The overview remains read-only for disputes; no review controls or fabricated placeholder records are rendered.

## Reports tab

Use the existing report start/end date controls. Add a dispute report section that is recalculated when the date range changes:

- The same five dispute KPIs, calculated from disputes created within the selected inclusive date range. The dispute rate is unique disputed inspection IDs in that range divided by inspections created in that same range.
- A graph showing dispute counts by status and a graph showing disputes by creation date.
- A complete dispute-history table for every filtered dispute record, sorted newest first. The table includes dispute ID, created date, inspection ID, inspector/submitter, meat type when available, original/model classification when available, expected classification, status, reason, reviewed date/reviewer when available, reviewer note when available, and developer-label application state/date when available.

The table must be horizontally usable on narrow screens and must show an explicit empty state when the selected range contains no disputes. Missing optional values use the existing neutral dash convention rather than invented values.

The reports surface remains compatible with the existing inspection report summary and export controls.

## Disputes tab

Replace the current review-card presentation in the admin Disputes tab with a numbers-only statistics panel containing exactly the five approved KPIs: total disputes, pending, approved, rejected, and dispute rate. It has loading and no-data states but no dispute table, chart, reason text, or review actions.

The underlying review queue client and mutation endpoints remain intact for other existing consumers; this UI change is limited to the admin Disputes tab.

## Components and boundaries

- Keep API types and fetch methods in the existing entities layer.
- Keep the pure dispute aggregation/filtering logic in the admin dashboard model/lib boundary so it can be unit tested without rendering.
- Keep shared KPI cards and chart/table presentation in focused admin-dashboard UI components reused by desktop and mobile wrappers where practical.
- Keep the existing desktop/mobile report wrappers and responsive styling conventions.
- Use existing `Card`, `ChartContainer`, Recharts, table primitives, icons, colors, and date utilities already used by the dashboard.

## Error handling and accessibility

- Surface API failures through the existing dashboard toast/error path.
- Use accessible headings, table headers, status text, and `aria-busy` where data is loading.
- Ensure graphs have nearby text headings and do not carry the only representation of a metric.
- Avoid color-only status meaning; pair each status with a visible label and numeric value.
- Use `-` for missing optional fields and a clear empty message for zero records.

## Testing and verification

Add or update tests for:

- The backend all-history repository/use-case/controller path and admin route wiring.
- Frontend client endpoint behavior.
- Pure dispute metric calculations, date filtering, status ordering, dispute-rate denominator, and empty inputs.
- Overview, Reports, and Disputes tab publication/render ownership, including mobile report coverage where existing component tests support it.
- Existing dispute review queue behavior remains unchanged.

Run targeted frontend/backend tests first, then the complete relevant local CI gates: lint, typecheck, frontend unit/component/integration/architecture tests, backend unit/architecture tests, contract tests, documentation validation, and a production build. Remote GitHub Actions status is checked if credentials/access are available; otherwise it is reported as unverified.

## Acceptance criteria

1. Admin dashboard loads all persisted dispute statuses through the new admin history read.
2. Overview shows five dispute KPIs plus status and trend graphs.
3. Reports applies its selected date range to dispute KPIs, graphs, and the full history table.
4. Reports table shows all filtered dispute records with the specified fields and no fabricated data.
5. Disputes tab shows only the five numeric KPIs and appropriate loading/empty states.
6. Desktop and mobile builds typecheck, lint, build, and pass their relevant tests.
7. Existing dispute submission/review APIs and review queue tests remain passing.
