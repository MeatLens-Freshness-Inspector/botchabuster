# Admin PDF Regulatory Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show date-aware regulatory-compliance status in every administrator range PDF, using `Not available` for inspections before `2026-08-05`.

**Architecture:** Keep the migration-date rule in the admin dashboard report transformation, where each inspection becomes a display-ready `ReportRow`. Pass that string through the admin report adapter into both the pork evidence model and the shared inspection-detail table. Keep the low-level PDF renderer organization- and date-agnostic; it only renders fields supplied by the report model.

**Tech Stack:** React/TypeScript, date-fns, pdfmake document definitions, Node test runner through `tsx`.

## Global Constraints

- The feature date is `2026-08-05`, matching migration `20260805160000_add_regulatory_compliance_to_inspections.sql`.
- Inspections before `2026-08-05` display `Not available`.
- Inspections on or after `2026-08-05` preserve `Compliant`, `Non-Compliant`, or `Not Recorded` semantics.
- Inspector-daily PDFs remain unchanged.
- Preserve the unrelated existing modification in `frontend/tests/unit/utilities/shared-date-storage.unit.test.ts`.

---

### Task 1: Add and test the date-aware admin compliance label

**Files:**
- Modify: `frontend/src/widgets/admin-dashboard/lib/dashboard.ts:145-221`
- Test: `frontend/tests/unit/domain/analysis/admin-report-protocol.unit.test.ts`

**Interfaces:**
- Consumes: an inspection’s `created_at`, nullable compliance source fields, and `resolveRegulatoryComplianceStatus`.
- Produces: `buildPreScanReportFields(inspection)` returning `regulatoryCompliance` with the date-aware display value.

- [ ] **Step 1: Write the failing tests**

Add tests that call `buildPreScanReportFields` with the same three source checks and these dates:

```ts
test("buildPreScanReportFields marks pre-feature inspections as unavailable", () => {
  const fields = buildPreScanReportFields({
    created_at: "2026-08-04T23:59:59.000Z",
    regulatory_compliance: true,
    storage_correct: true,
    light_color_correct: true,
    light_color_observed: null,
    area_clean: true,
    stall_number: null,
    meat_inspection_certificate_proof: null,
    meat_expiry_date: null,
    inspection_decision_source: null,
    protocol_spoiled_reason: null,
  });

  assert.equal(fields.regulatoryCompliance, "Not available");
});

test("buildPreScanReportFields includes compliance on the feature date", () => {
  const fields = buildPreScanReportFields({
    created_at: "2026-08-05T00:00:00.000Z",
    regulatory_compliance: true,
    storage_correct: true,
    light_color_correct: true,
    light_color_observed: null,
    area_clean: true,
    stall_number: null,
    meat_inspection_certificate_proof: null,
    meat_expiry_date: null,
    inspection_decision_source: null,
    protocol_spoiled_reason: null,
  });

  assert.equal(fields.regulatoryCompliance, "Compliant");
});

test("buildPreScanReportFields keeps post-feature missing compliance distinct", () => {
  const fields = buildPreScanReportFields({
    created_at: "2026-08-06T00:00:00.000Z",
    regulatory_compliance: null,
    storage_correct: null,
    light_color_correct: null,
    light_color_observed: null,
    area_clean: null,
    stall_number: null,
    meat_inspection_certificate_proof: null,
    meat_expiry_date: null,
    inspection_decision_source: null,
    protocol_spoiled_reason: null,
  });

  assert.equal(fields.regulatoryCompliance, "Not Recorded");
});
```

Update the test import to include `buildPreScanReportFields` if it is not already imported.

- [ ] **Step 2: Run tests to verify they fail**

Run from the repository root:

```powershell
npm exec --workspace frontend -- tsx --test tests/unit/domain/analysis/admin-report-protocol.unit.test.ts
```

Expected: FAIL because the input type does not yet accept `created_at` and the current helper always returns `Not Recorded`/the resolved status without the historical date rule.

- [ ] **Step 3: Write the minimal implementation**

Add a single exported constant and helper in `dashboard.ts`, then use it in `buildPreScanReportFields`:

```ts
export const REGULATORY_COMPLIANCE_AVAILABLE_FROM = "2026-08-05";

const formatRegulatoryComplianceLabelForInspection = (
  createdAt: string,
  compliance: boolean | null,
): string => {
  if (createdAt.slice(0, 10) < REGULATORY_COMPLIANCE_AVAILABLE_FROM) {
    return "Not available";
  }
  return formatRegulatoryComplianceLabel(compliance);
};
```

Include `created_at` in the `Pick<Inspection, ...>` input and call the new helper with `inspection.created_at` and `resolveRegulatoryComplianceStatus(inspection)`. Keep the existing `true`/`false`/`null` labels unchanged for eligible records.

- [ ] **Step 4: Run the focused tests to verify they pass**

Run the same command. Expected: all tests in `admin-report-protocol.unit.test.ts` pass with zero failures.

- [ ] **Step 5: Commit the isolated behavior change**

```powershell
git add -- frontend/src/widgets/admin-dashboard/lib/dashboard.ts frontend/tests/unit/domain/analysis/admin-report-protocol.unit.test.ts
git commit -m "fix: date-gate admin compliance labels"
```

### Task 2: Carry compliance through the admin PDF model

**Files:**
- Modify: `frontend/src/features/reports/lib/adapters/admin-range-report.ts:20-38, 260-330`
- Modify: `frontend/src/widgets/admin-dashboard/lib/dashboard.ts:223-280`
- Modify: `frontend/src/features/reports/model/types.ts:49-59`
- Test: `frontend/tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts`

**Interfaces:**
- Consumes: `ReportRow.regulatoryCompliance` from the dashboard model.
- Produces: `ReportInspectionEvidenceItem.regulatoryCompliance` and an admin detail-table compliance column.

- [ ] **Step 1: Write the failing model test**

Extend the existing admin PDF model fixture with `regulatoryCompliance: "Compliant"` and assert:

```ts
assert.equal(
  porkGallery?.inspectionEvidence?.[0].regulatoryCompliance,
  "Compliant",
);

const detailSection = model.sections.find((section) => section.id === "meat-detail");
assert.deepEqual(detailSection?.tables?.[0].columns, [
  "Created",
  "Inspector",
  "Location",
  "Meat",
  "Classification",
  "Confidence",
  "Regulatory Compliance",
]);
assert.equal(detailSection?.tables?.[0].rows[0][6], "Compliant");
```

- [ ] **Step 2: Run the model test to verify it fails**

```powershell
npm exec --workspace frontend -- tsx --test tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts
```

Expected: FAIL because the current adapter drops `regulatoryCompliance`, evidence items do not expose it, and the detail table has only six columns.

- [ ] **Step 3: Write the minimal implementation**

Add `regulatoryCompliance: string` to the adapter’s `AdminReportRow`; forward `row.regulatoryCompliance` from `buildAdminDashboardReportPdfModel`; add `regulatoryCompliance: string` to `ReportInspectionEvidenceItem`; map it in `buildPorkInspectionEvidence`; and update the admin detail table:

```ts
columns: [
  "Created",
  "Inspector",
  "Location",
  "Meat",
  "Classification",
  "Confidence",
  "Regulatory Compliance",
],
rows: input.reportRows.map((row) => [
  row.createdAt,
  row.inspector,
  row.location,
  row.meatType,
  row.classification,
  `${row.confidenceScore}%`,
  row.regulatoryCompliance,
]),
```

The dashboard’s `ReportRow` type already contains `regulatoryCompliance`; no API or database changes are needed.

- [ ] **Step 4: Run the model tests to verify they pass**

Run the same focused command. Expected: all tests pass with zero failures.

- [ ] **Step 5: Commit the model pass-through**

```powershell
git add -- frontend/src/features/reports/model/types.ts frontend/src/features/reports/lib/adapters/admin-range-report.ts frontend/src/widgets/admin-dashboard/lib/dashboard.ts frontend/tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts
git commit -m "fix: include compliance in admin report model"
```

### Task 3: Render compliance in admin PDF evidence cards

**Files:**
- Modify: `frontend/src/features/reports/lib/pdf/document-sections.ts:70-103`
- Test: `frontend/tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts`

**Interfaces:**
- Consumes: `ReportInspectionEvidenceItem.regulatoryCompliance`.
- Produces: PDF content containing a `Regulatory Compliance` field for each rendered evidence card.

- [ ] **Step 1: Write the failing renderer test**

Add `regulatoryCompliance: "Non-Compliant"` to `sampleDtiAdminPorkModel` and extend the existing evidence-card assertion:

```ts
const sectionTexts = collectNodeTexts(porkSection);
assert.ok(sectionTexts.includes("Regulatory Compliance"));
assert.ok(sectionTexts.includes("Non-Compliant"));
```

- [ ] **Step 2: Run the renderer test to verify it fails**

```powershell
npm exec --workspace frontend -- tsx --test tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
```

Expected: FAIL because the evidence renderer currently emits only Inspector, Captured, Meat, Classification, Confidence, and Location fields.

- [ ] **Step 3: Write the minimal implementation**

Append this field in `buildInspectionEvidenceContent` after the confidence field and before location:

```ts
buildInspectionEvidenceField(
  "Regulatory Compliance",
  evidenceItem.regulatoryCompliance,
),
```

- [ ] **Step 4: Run the renderer tests to verify they pass**

Run the same focused command. Expected: all tests pass with zero failures.

- [ ] **Step 5: Commit the PDF rendering change**

```powershell
git add -- frontend/src/features/reports/lib/pdf/document-sections.ts frontend/tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
git commit -m "fix: render compliance in admin PDF evidence"
```

### Task 4: Verify the complete change

**Files:**
- No new production files.
- Inspect: `docs/superpowers/specs/2026-08-26-admin-pdf-regulatory-compliance-design.md`

- [ ] **Step 1: Run the focused regression suite**

```powershell
npm exec --workspace frontend -- tsx --test tests/unit/domain/analysis/admin-report-protocol.unit.test.ts tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
```

Expected: all selected tests pass.

- [ ] **Step 2: Run frontend typecheck and lint**

```powershell
npm run typecheck --workspace frontend
npm run lint --workspace frontend
```

Expected: both commands exit 0 with no errors.

- [ ] **Step 3: Run the full frontend unit suite**

```powershell
npm run test:unit --workspace frontend
```

Expected: all frontend unit tests pass. The command’s pretest backend build may run first according to `frontend/package.json`.

- [ ] **Step 4: Review the final diff and working tree**

```powershell
git diff --check
git status --short
git log -4 --oneline
```

Expected: no whitespace errors; only the three implementation commits plus the pre-existing `frontend/tests/unit/utilities/shared-date-storage.unit.test.ts` modification are present in the working tree.
