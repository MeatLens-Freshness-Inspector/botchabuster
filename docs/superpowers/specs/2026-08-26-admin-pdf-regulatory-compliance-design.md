# Admin PDF Regulatory Compliance Design

## Goal

Ensure every administrator-generated PDF exposes the regulatory-compliance status for pork inspections, while making historical records unambiguous. Inspections created before the regulatory-compliance feature date display `Not available` because that field did not exist for those records.

## Behavior

- The feature date is `2026-08-05` (August 5, 2026), matching migration `20260805160000_add_regulatory_compliance_to_inspections.sql`.
- The inspection `created_at` date determines whether the record predates the feature. The date is compared by calendar date, so an inspection on August 5, 2026 is eligible for the field.
- Before `2026-08-05`, the displayed value is `Not available`, regardless of any legacy/null source value.
- On or after `2026-08-05`, the existing compliance resolution is preserved:
  - `true` → `Compliant`
  - `false` → `Non-Compliant`
  - `null` → `Not Recorded`

## Data flow and boundaries

1. `useDashboardReport` builds each `ReportRow` from the filtered inspection and computes the date-aware compliance label.
2. `buildAdminDashboardReportPdfModel` forwards that label into the report adapter instead of dropping it.
3. `buildAdminRangeReportModel` includes the label in each pork evidence item and in the shared inspection-detail table.
4. The PDF document section renderer displays the evidence-item field alongside inspector, capture, classification, confidence, and location.

The low-level PDF renderer receives display-ready strings and does not know the migration date. Inspector-daily PDFs are unchanged; this rule applies to the administrator range-report model only.

## PDF presentation

- DTI and City Veterinary Office admin PDFs show `Regulatory Compliance` on pork evidence cards.
- Gordon College admin PDFs suppress the pork evidence gallery as currently designed, so the shared inspection-detail table carries the compliance column for those records as well.
- The detail table includes the compliance column for all rows, keeping the schema consistent across organizations and ensuring every admin PDF has the field even when a gallery is not rendered.

## Testing

- Add admin report transformation coverage for records before August 5, on August 5, and after August 5.
- Assert the compliance label is forwarded into pork evidence and the detail table.
- Add PDF document rendering coverage that verifies the evidence card contains the compliance label.
- Run the focused frontend unit tests, then the repository’s frontend checks/build as available.

## Error handling

Malformed or absent compliance values continue through the existing nullable resolver. Post-feature records with no pre-scan data remain `Not Recorded`; pre-feature records always use `Not available` to distinguish unsupported historical data from a current record with no result.
