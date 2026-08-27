# Required Report Images and Compliance Reasons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the regulatory compliance reason beside each admin pork evidence image and prevent PDF exports from silently replacing failed stored images with an unavailable-image placeholder.

**Architecture:** The dashboard report row will carry a formatted compliance reason derived from the same three pre-scan checks used by the backend. The PDF evidence model will pass that reason to the right-hand metadata column. The report asset loader and concurrency queue will propagate image-fetch failures, and the evidence renderer will reject document construction when a record has an image URL but no image data can be loaded.

**Tech Stack:** TypeScript, React/Vite frontend, pdfmake document definitions, Node test runner via `tsx`.

## Global Constraints

- Keep `No image captured` only for records with no image URL.
- Never render `Inspection image unavailable` or another silent placeholder when a stored image URL fails to load.
- Include the requested image URL and HTTP status, when available, in image-load errors.
- Compliance reasons use only storage correctness, light-color correctness, and area cleanliness because those are the backend’s compliance inputs.
- Preserve the existing pre-feature date behavior: records before `2026-08-05` explain that compliance was not available.
- Do not modify `frontend/tests/unit/utilities/shared-date-storage.unit.test.ts`; it is an unrelated user change.

---

### Task 1: Add compliance reasons to admin evidence data

**Files:**
- Modify: `frontend/src/widgets/admin-dashboard/model/types.ts`
- Modify: `frontend/src/widgets/admin-dashboard/lib/dashboard.ts`
- Modify: `frontend/src/widgets/admin-dashboard/model/use-dashboard-report.ts`
- Modify: `frontend/src/features/reports/lib/adapters/admin-range-report.ts`
- Modify: `frontend/src/features/reports/model/types.ts`
- Modify: `frontend/src/features/reports/lib/pdf/document-sections.ts`
- Test: `frontend/tests/unit/domain/analysis/admin-report-protocol.unit.test.ts`
- Test: `frontend/tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts`
- Test: `frontend/tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts`

**Interfaces:**
- Produce `regulatoryComplianceReason: string` on dashboard `ReportRow`, admin adapter rows, and `ReportInspectionEvidenceItem`.
- Add an exported formatter in `dashboard.ts` that accepts `created_at`, the resolved compliance value, and the three source check values.

- [ ] **Step 1: Write failing reason assertions**

Add assertions covering:

```ts
assert.equal(
  buildPreScanReportFields({
    created_at: "2026-08-05T00:00:00.000Z",
    storage_correct: true,
    light_color_correct: true,
    area_clean: true,
    regulatory_compliance: true,
    stall_number: null,
    meat_inspection_certificate_proof: null,
    meat_expiry_date: null,
    light_color_observed: null,
    inspection_decision_source: null,
    protocol_spoiled_reason: null,
  }).regulatoryComplianceReason,
  "All pre-scan safety checks passed.",
);
```

Also assert a non-compliant record names only failed checks, and a pre-feature record explains that compliance was not available.

- [ ] **Step 2: Run the focused protocol test and verify RED**

Run:

```text
npm run test:unit --workspace frontend -- tests/unit/domain/analysis/admin-report-protocol.unit.test.ts
```

Expected: FAIL because `regulatoryComplianceReason` is not present yet.

- [ ] **Step 3: Implement the formatter and pass the reason through the model**

Use these exact reason rules:

```ts
if (createdAt.slice(0, 10) < REGULATORY_COMPLIANCE_AVAILABLE_FROM) {
  return "Regulatory compliance was not available for this record.";
}
if (compliance === true) return "All pre-scan safety checks passed.";
if (compliance === null || compliance === undefined) {
  return "No pre-scan safety checks were recorded.";
}
const failedChecks = [
  storageCorrect !== true ? "Storage Correct" : null,
  lightColorCorrect !== true ? "Light Color Correct" : null,
  areaClean !== true ? "Area Clean" : null,
].filter((value): value is string => value !== null);
return failedChecks.length > 0
  ? `Failed checks: ${failedChecks.join(", ")}.`
  : "The pre-scan checks did not all pass.";
```

Pass the formatted reason from `buildPreScanReportFields` through `useDashboardReport`, `buildAdminDashboardReportPdfModel`, `buildAdminRangeReportModel`, and `buildPorkInspectionEvidence`.

- [ ] **Step 4: Render the reason in the evidence card’s right column**

After the `Regulatory Compliance` field, add:

```ts
buildInspectionEvidenceField("Reason", evidenceItem.regulatoryComplianceReason)
```

Keep it conditional so inspector-daily report evidence without admin compliance data remains unchanged.

- [ ] **Step 5: Run the focused report tests and verify GREEN**

Run:

```text
npm run test:unit --workspace frontend -- tests/unit/domain/analysis/admin-report-protocol.unit.test.ts tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
```

Expected: all selected tests pass, including reason text in the generated admin evidence content.

- [ ] **Step 6: Commit Task 1**

```text
git add frontend/src/widgets/admin-dashboard/model/types.ts frontend/src/widgets/admin-dashboard/lib/dashboard.ts frontend/src/widgets/admin-dashboard/model/use-dashboard-report.ts frontend/src/features/reports/lib/adapters/admin-range-report.ts frontend/src/features/reports/model/types.ts frontend/src/features/reports/lib/pdf/document-sections.ts frontend/tests/unit/domain/analysis/admin-report-protocol.unit.test.ts frontend/tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts frontend/tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
git commit -m "feat: explain admin PDF compliance status"
```

### Task 2: Make stored evidence images required and expose load failures

**Files:**
- Modify: `frontend/src/features/reports/lib/pdf/assets.ts`
- Modify: `frontend/src/features/reports/lib/pdf/build-doc-definition.ts`
- Modify: `frontend/src/features/reports/lib/pdf/document-sections.ts`
- Test: `frontend/tests/unit/features/reports/pdf-asset-loader.unit.test.ts`
- Test: `frontend/tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts`

**Interfaces:**
- `createReportInspectionImageLoader` continues to return `Promise<string | null>` for empty paths, but rejects when its supplied loader rejects.
- The default report image loader throws on a non-empty path when fetch is not successful, the response is not an image, or the image data is empty.
- `buildReportDocDefinition` rejects if an evidence item has an image URL and the loader returns `null`.

- [ ] **Step 1: Write failing error-propagation tests**

Add a loader test:

```ts
await assert.rejects(
  load("broken"),
  /broken image error/,
);
```

Add a document-definition test with an image URL and an injected loader returning `null`:

```ts
await assert.rejects(
  buildReportDocDefinition(sampleDtiAdminPorkModel, {
    loadBrandAsset: async (path) => `mocked:${path}`,
    loadInspectionImageAsset: async () => null,
  }),
  /Failed to load inspection image/,
);
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```text
npm run test:unit --workspace frontend -- tests/unit/features/reports/pdf-asset-loader.unit.test.ts tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
```

Expected: FAIL because the queue currently converts rejection to `null` and document construction currently renders an unavailable placeholder.

- [ ] **Step 3: Preserve queue rejection and make network errors descriptive**

Update the queue entries to carry both `resolve` and `reject`, pass the loader rejection to `reject`, and retain the `finally` pump behavior. Replace the default optional loader with a required loader that:

```ts
if (!response.ok) {
  throw new Error(
    `Failed to load inspection image "${path}" (HTTP ${response.status} ${response.statusText})`,
  );
}
const blob = await response.blob();
if (blob.size === 0 || !blob.type.startsWith("image/")) {
  throw new Error(`Failed to load inspection image "${path}" (response was not image data)`);
}
```

Keep empty paths returning `null` so records without captured images can retain the existing `No image captured` state.

- [ ] **Step 4: Reject evidence construction for non-empty failed image URLs**

Change `resolveInspectionImageState` so it does not catch and convert loader errors to an unavailable state. If a non-empty path returns `null`, throw an error containing `Failed to load inspection image` and the path. Remove the `unavailable` branch and its placeholder copy; retain only the missing-image placeholder for a genuinely empty image URL.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```text
npm run test:unit --workspace frontend -- tests/unit/features/reports/pdf-asset-loader.unit.test.ts tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
```

Expected: all selected tests pass and no test expects `Inspection image unavailable` for a failed stored image.

- [ ] **Step 6: Commit Task 2**

```text
git add frontend/src/features/reports/lib/pdf/assets.ts frontend/src/features/reports/lib/pdf/build-doc-definition.ts frontend/src/features/reports/lib/pdf/document-sections.ts frontend/tests/unit/features/reports/pdf-asset-loader.unit.test.ts frontend/tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
git commit -m "fix: fail PDF export when inspection images cannot load"
```

### Task 3: Full verification

**Files:**
- No additional source files.

- [ ] **Step 1: Run frontend unit tests**

```text
npm run test:unit --workspace frontend
```

Expected: zero failures.

- [ ] **Step 2: Run frontend typecheck and lint**

```text
npm run typecheck --workspace frontend
npm run lint --workspace frontend
```

Expected: typecheck exits 0; lint exits 0 with no errors.

- [ ] **Step 3: Build the production frontend**

```text
npm run build --workspace frontend
```

Expected: production build exits 0 and emits the PDF chunks.

- [ ] **Step 4: Commit any only-if-needed test corrections**

If verification reveals a test fixture that does not represent the approved behavior, update only that fixture/test and run the affected test again before committing it with:

```text
git add <the corrected test file>
git commit -m "test: align report export fixtures"
```
