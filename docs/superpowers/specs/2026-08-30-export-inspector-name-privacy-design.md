# Export Inspector Name Privacy Design

## Goal

Abbreviate an inspector's first name in every exportable report for DTI, GCCCS, and City Vet. For example, `Adriaan Dimate` becomes `A. Dimate`.

The change is export-only. Dashboard tables, filters, charts, profile views, and source data continue to use the existing inspector label.

## Scope

The abbreviated label is applied to the following admin export outputs:

- PDF detail tables and photo evidence cards.
- CSV `Inspector` column values.
- JSON inspection records and `topInspectors` entries.

The inspector's email, inspector code, and other separate identifying fields are not changed. The inspector daily PDF does not currently include an inspector-name field, so it requires no additional display change.

## Design

Add a small pure formatter in the reports feature. It trims a label, abbreviates the first whitespace-delimited token when a surname or additional name text exists, and preserves non-name fallback labels such as email addresses, inspector codes, unknown labels, empty values, and single-token values. The formatter is called at export boundaries rather than when report rows are built, ensuring in-app report data remains unchanged.

The PDF report model will use the formatter for both inspection-detail table rows and pork evidence inspector labels. CSV and JSON handlers will call the same formatter when creating their serialized values. JSON `topInspectors` values will be mapped without changing their counts or sorting.

## Error handling

Formatting is total and non-throwing for nullable or fallback labels. Whitespace is normalized by trimming the input; empty input remains empty. No export flow, filtering behavior, or report generation error handling changes.

## Testing

Add unit coverage for:

- Normal full names, names with additional parts, and whitespace.
- Preservation of email, code, unknown, empty, and single-token labels.
- PDF report model abbreviation in detail rows and evidence cards.
- CSV/JSON serialization using abbreviated inspector names while retaining other identifying fields.

Existing report, export, and frontend checks remain the regression suite.
