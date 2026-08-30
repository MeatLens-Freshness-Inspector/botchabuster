# Export Inspector Name Privacy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Abbreviate inspector first names in every DTI, GCCCS, and City Vet admin export while preserving full names in the application UI and source data.

**Architecture:** Add one pure formatter to the reports feature and call it only at export boundaries. The PDF adapter will format inspector values as it builds export content; the CSV and JSON handlers will use explicit pure boundary helpers from the admin-dashboard library. Fallback labels such as email addresses, inspector codes, unknown labels, empty values, and single-token values remain unchanged.

**Tech Stack:** React, TypeScript, pdfmake, Node test runner via `tsx`.

## Global Constraints

- The change is export-only; dashboard tables, filters, charts, profile views, and source data continue to use the existing inspector label.
- Apply the abbreviated label to PDF detail tables, PDF photo evidence cards, the CSV `Inspector` column, JSON inspection records, and JSON `topInspectors` entries.
- Do not alter inspector email, inspector code, or other separate identifying fields.
- Preserve existing export error handling and report filtering behavior.
- Keep the implementation limited to the existing reports and admin-dashboard export paths; do not add dependencies.
- Preserve unrelated pre-existing worktree changes and stage only files belonging to this feature in each commit.
- Deliver seven meaningful commits total, counting the existing spec commit and this plan commit.

---

### Task 1: Add the failing formatter tests

**Files:**
- Modify: `frontend/tests/unit/features/reports/report-formatting.unit.test.ts`

**Interfaces:**
- Consumes: the future `formatInspectorNameForExport` export from `frontend/src/features/reports/lib/formatting.ts`.
- Produces: executable red tests defining full-name abbreviation and fallback preservation.

- [ ] **Step 1: Write the failing test**

Add these cases to the existing report-formatting test file:

```ts
import { formatInspectorNameForExport, formatReportDateTime, formatReportPercentage } from "../../../../src/features/reports/lib/formatting";

test("formatInspectorNameForExport abbreviates the first name and preserves the remaining name", () => {
  assert.equal(formatInspectorNameForExport("Adriaan Dimate"), "A. Dimate");
  assert.equal(formatInspectorNameForExport("  Maria Clara Santos  "), "M. Clara Santos");
});

test("formatInspectorNameForExport preserves non-name fallback labels", () => {
  assert.equal(formatInspectorNameForExport("inspector@example.com"), "inspector@example.com");
  assert.equal(formatInspectorNameForExport("INSP-01"), "INSP-01");
  assert.equal(formatInspectorNameForExport("Unknown Inspector"), "Unknown Inspector");
  assert.equal(formatInspectorNameForExport("SingleName"), "SingleName");
  assert.equal(formatInspectorNameForExport("   "), "");
});
```

Merge the formatter import into the current import block and retain all existing assertions.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:unit -w frontend -- tests/unit/features/reports/report-formatting.unit.test.ts`

Expected: FAIL because `formatInspectorNameForExport` is not exported yet. The failure must be an import/export or missing-function failure, not a syntax error.

- [ ] **Step 3: Commit the red tests**

```bash
git add -- frontend/tests/unit/features/reports/report-formatting.unit.test.ts
git commit -m "test: define export inspector name formatting"
```

This is commit 3 of 7.

### Task 2: Implement the shared export formatter

**Files:**
- Modify: `frontend/src/features/reports/lib/formatting.ts`
- Test: `frontend/tests/unit/features/reports/report-formatting.unit.test.ts`

**Interfaces:**
- Consumes: a `string | null | undefined` inspector label.
- Produces: `formatInspectorNameForExport(value: string | null | undefined): string`.

- [ ] **Step 1: Write the minimal implementation**

Add this function to `frontend/src/features/reports/lib/formatting.ts`:

```ts
export function formatInspectorNameForExport(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed.includes("@")) return trimmed;

  const parts = trimmed.split(/\s+/);
  if (parts.length < 2 || parts[0].toUpperCase() === "UNKNOWN") return trimmed;

  return `${parts[0].charAt(0).toUpperCase()}. ${parts.slice(1).join(" ")}`;
}
```

This keeps the formatter total and non-throwing, leaves email/code/single-token/unknown fallbacks intact, and normalizes surrounding whitespace for real names.

- [ ] **Step 2: Run the focused tests to verify they pass**

Run: `npm run test:unit -w frontend -- tests/unit/features/reports/report-formatting.unit.test.ts`

Expected: PASS with all tests in that file passing.

- [ ] **Step 3: Commit the implementation**

```bash
git add -- frontend/src/features/reports/lib/formatting.ts
git commit -m "feat: add export inspector name formatter"
```

This is commit 4 of 7.

### Task 3: Apply formatting to PDF report exports

**Files:**
- Modify: `frontend/src/features/reports/lib/adapters/admin-range-report.ts`
- Modify: `frontend/tests/unit/domain/analysis/admin-range-report-adapter.unit.test.ts`
- Modify: `frontend/tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts`

**Interfaces:**
- Consumes: `formatInspectorNameForExport` and existing `AdminReportRow` values.
- Produces: abbreviated inspector labels in the PDF model’s inspection-detail table and pork evidence cards, for every organization template.

- [ ] **Step 1: Add the failing PDF model assertions**

In the existing DTI adapter test that supplies `Inspector One` and `Inspector Two`, change only the expected `inspectionEvidence` labels to:

```ts
assert.deepEqual(
  porkGallery?.inspectionEvidence?.map((item) => item.inspectorLabel),
  ["I. One", "I. Two"],
);
```

Add an assertion for the detail table in the same test:

```ts
const detailSection = model.sections.find((section) => section.id === "meat-detail");
assert.equal(detailSection?.tables?.[0].rows[0][1], "I. One");
```

Add a second adapter test using `reportOrganization: "city_veterinary_office_olongapo"` and a row with `inspector: "Maria Santos"`; assert that both its pork evidence label and detail-table inspector cell are `"M. Santos"`. Do not change the UI-facing `ReportRow` fixture values.

- [ ] **Step 2: Run the PDF adapter tests to verify they fail**

Run: `npm run test:unit -w frontend -- tests/unit/domain/analysis/admin-range-report-adapter.unit.test.ts tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts`

Expected: FAIL because the PDF model still contains the full inspector labels.

- [ ] **Step 3: Apply the formatter at both PDF model output points**

In `admin-range-report.ts`, import `formatInspectorNameForExport` from `../formatting` and update the two export-only values:

```ts
inspectorLabel: formatInspectorNameForExport(row.inspector),
```

and in the shared inspection-detail row mapping:

```ts
formatInspectorNameForExport(row.inspector),
```

Do not modify `AdminReportRow.inspector`, report summaries, sorting, or any non-PDF model input.

- [ ] **Step 4: Run the PDF tests to verify they pass**

Run: `npm run test:unit -w frontend -- tests/unit/domain/analysis/admin-range-report-adapter.unit.test.ts tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts`

Expected: PASS with the new DTI and other-organization assertions passing.

- [ ] **Step 5: Commit the PDF export change**

```bash
git add -- frontend/src/features/reports/lib/adapters/admin-range-report.ts frontend/tests/unit/domain/analysis/admin-range-report-adapter.unit.test.ts frontend/tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts
git commit -m "feat: abbreviate inspector names in pdf exports"
```

This is commit 5 of 7.

### Task 4: Apply formatting to CSV exports

**Files:**
- Modify: `frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts`
- Create: `frontend/tests/unit/widgets/admin-dashboard/report-export-formatting.unit.test.ts`

**Interfaces:**
- Consumes: `formatInspectorNameForExport` and the existing CSV row construction.
- Produces: abbreviated values only in the CSV `Inspector` column while preserving email and inspector-code columns.

- [ ] **Step 1: Add a focused CSV boundary test seam**

Add the smallest pure export-row helper to `frontend/src/widgets/admin-dashboard/lib/dashboard.ts`:

```ts
export function formatReportRowForExport(row: ReportRow): ReportRow {
  return { ...row, inspector: formatInspectorNameForExport(row.inspector) };
}
```

Create the focused test file and add a unit assertion for a row with `Adriaan Dimate`, email `adriaan@example.com`, and code `INSP-01`:

```ts
const exported = formatReportRowForExport(row);
assert.equal(exported.inspector, "A. Dimate");
assert.equal(exported.inspectorEmail, "adriaan@example.com");
assert.equal(exported.inspectorCode, "INSP-01");
```

Use the existing report-row type and test conventions; do not test browser download mechanics.

- [ ] **Step 2: Run the CSV boundary test to verify it fails**

Run: `npm run test:unit -w frontend -- tests/unit/widgets/admin-dashboard/report-export-formatting.unit.test.ts`

Expected: FAIL because the helper does not yet abbreviate the inspector value.

- [ ] **Step 3: Use the helper in the CSV export handler**

Import `formatReportRowForExport` and use it for each source row before reading the CSV cells:

```ts
const exportedRow = formatReportRowForExport(row);
exportedRow.inspector,
```

Keep `exportedRow.inspectorEmail` and `exportedRow.inspectorCode` unchanged, and keep the rest of the CSV column order unchanged.

- [ ] **Step 4: Run the CSV boundary and existing report tests**

Run: `npm run test:unit -w frontend -- tests/unit/features/reports tests/unit/domain/analysis/admin-range-report-adapter.unit.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the CSV export change**

```bash
git add -- frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts frontend/src/widgets/admin-dashboard/lib/dashboard.ts frontend/tests/unit/features/reports
git commit -m "feat: abbreviate inspector names in csv exports"
```

This is commit 6 of 7.

### Task 5: Apply formatting to JSON exports

**Files:**
- Modify: `frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts`
- Modify: `frontend/src/widgets/admin-dashboard/lib/dashboard.ts`
- Modify: `frontend/tests/unit/widgets/admin-dashboard/report-export-formatting.unit.test.ts`

**Interfaces:**
- Consumes: `formatReportRowForExport`, a new `formatTopInspectorForExport` helper, existing `reportRows`, and existing `reportTopInspectors`.
- Produces: abbreviated `inspector` values in JSON inspection rows and `topInspectors`, with counts, sorting, email, and code data otherwise unchanged.

- [ ] **Step 1: Add failing JSON boundary assertions**

Use the existing row helper for the JSON inspection mapping and add this expected shape:

```ts
const exported = formatReportRowForExport({
  ...row,
  inspector: "Adriaan Dimate",
  inspectorEmail: "adriaan@example.com",
  inspectorCode: "INSP-01",
});

assert.equal(exported.inspector, "A. Dimate");
assert.equal(exported.inspectorEmail, "adriaan@example.com");
assert.equal(exported.inspectorCode, "INSP-01");
```

Also add this failing assertion for the top-inspector boundary:

```ts
const topInspector = formatTopInspectorForExport({
  inspector: "Adriaan Dimate",
  count: 4,
  averageConfidence: 91,
});

assert.deepEqual(topInspector, {
  inspector: "A. Dimate",
  count: 4,
  averageConfidence: 91,
});
```

- [ ] **Step 2: Run the JSON boundary test to verify it fails**

Run the focused test file.

Expected: FAIL because `formatTopInspectorForExport` is not exported yet.

- [ ] **Step 3: Apply the formatter in the JSON export flow**

Map JSON inspection records with `formatReportRowForExport` after the existing developer/non-developer projection:

```ts
const reportExportInspections = (isDeveloper ? reportRows : reportRows.map(({ manualClassification: _manualClassification, ...row }) => row))
  .map(formatReportRowForExport);
```

Add this exact helper to `frontend/src/widgets/admin-dashboard/lib/dashboard.ts` before using it in the JSON handler:

```ts
export function formatTopInspectorForExport<T extends { inspector: string }>(entry: T): T {
  return { ...entry, inspector: formatInspectorNameForExport(entry.inspector) };
}
```

Map `reportTopInspectors` similarly:

```ts
const exportedTopInspectors = reportTopInspectors.map(formatTopInspectorForExport);
```

Use `exportedTopInspectors` in the payload. Keep all other JSON properties and developer gating unchanged.

- [ ] **Step 4: Run focused JSON/PDF/report tests**

Run: `npm run test:unit -w frontend -- tests/unit/features/reports tests/unit/domain/analysis/admin-range-report-adapter.unit.test.ts tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the JSON export change**

```bash
git add -- frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts frontend/src/widgets/admin-dashboard/lib/dashboard.ts frontend/tests/unit/features/reports
git commit -m "feat: abbreviate inspector names in json exports"
```

This is commit 7 of 7.

### Final Verification

- [ ] Run `git diff --check` and confirm only intended feature files are staged or committed; do not include the pre-existing `document-sections.ts`, `shared-date-storage.unit.test.ts`, or manual-generation files.
- [ ] Run `npm run typecheck -w frontend`.
- [ ] Run `npm run lint -w frontend`.
- [ ] Run the focused report/export unit tests and then `npm run test:unit -w frontend`.
- [ ] Inspect `git log -7 --oneline` and confirm the feature has seven meaningful commits including the spec and plan commits.
