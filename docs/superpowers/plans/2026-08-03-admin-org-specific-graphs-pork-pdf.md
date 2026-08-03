# Admin Organization-Specific Graphs and Pork PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make admin PDF exports organization-specific by adding real graph sections for every organization and all real pork-image evidence cards for DTI and City Vet, while GCCCS remains technical-first without the pork gallery.

**Architecture:** Extend the shared admin report model so it can carry chart payloads plus pork evidence candidates derived entirely from the filtered admin report rows. Organization templates then decide section titles, order, and whether the pork gallery appears. The shared PDF builder remains the single rendering engine and gains two additive rendering paths: pure SVG chart blocks for the PDF graph section, and richer photo-first evidence cards for DTI and City Vet pork galleries.

**Tech Stack:** TypeScript, React frontend, date-fns, pdfmake, Node test runner via `tsx --test`

## Global Constraints

- Admin exports remain actual PDF files generated in the frontend.
- The existing organization letterhead/page-frame system remains in use.
- The report must remain document-like rather than a printed web view.
- All admin PDFs must include graphs.
- The graph set is fixed for every organization: classification breakdown, daily inspection trend, meat-type breakdown.
- Graphs must be built from the already filtered real report data for the selected date range.
- DTI and City Vet admin PDFs must include both graphs and pork meat images.
- GCCCS admin PDFs remain technical-first and do not include the pork gallery.
- DTI / City Vet section order is overview -> graphs -> pork gallery -> detailed meat report.
- GCCCS section order is technical overview -> graphs -> detailed meat report.
- Use only existing real report data already available in the frontend.
- Do not introduce new backend endpoints or placeholder metrics.
- Do not synthesize graph points or gallery records that do not exist in the filtered range.
- Broken image assets must fail gracefully without aborting PDF export.
- The solution stays in the frontend real-PDF pipeline.
- Execute the work in a dedicated git worktree and keep commits small.

---

## File Structure Map

### Shared admin report model and adapter files

- Modify: `frontend/src/lib/reports/types.ts`
- Modify: `frontend/src/lib/reports/adapters/adminRangeReport.ts`
- Modify: `frontend/src/pages/admin-dashboard/types.ts`
- Modify: `frontend/src/pages/admin-dashboard/hooks/useAdminDashboardPage.ts`
- Modify: `frontend/src/pages/admin-dashboard/utils/adminDashboard.ts`
- Modify: `frontend/tests/unit/domain/analysis/admin-range-report-adapter.unit.test.ts`
- Modify: `frontend/tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts`

### Admin template files

- Create: `frontend/src/lib/reports/templates/adminSectionOrder.ts`
- Create: `frontend/tests/unit/domain/analysis/admin-report-templates.unit.test.ts`
- Modify: `frontend/src/lib/reports/templates/dtiTemplate.ts`
- Modify: `frontend/src/lib/reports/templates/cityVetTemplate.ts`
- Modify: `frontend/src/lib/reports/templates/gcccsTemplate.ts`
- Modify: `frontend/tests/unit/domain/analysis/report-template-selection.unit.test.ts`

### PDF chart and pork gallery rendering files

- Create: `frontend/src/lib/reports/pdf/reportCharts.ts`
- Modify: `frontend/src/lib/reports/pdf/buildDocDefinition.ts`
- Modify: `frontend/tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts`

## Task 1: Normalize Admin Graph Data And Pork Gallery Candidates

**Files:**
- Modify: `frontend/src/lib/reports/types.ts`
- Modify: `frontend/src/lib/reports/adapters/adminRangeReport.ts`
- Modify: `frontend/src/pages/admin-dashboard/types.ts`
- Modify: `frontend/src/pages/admin-dashboard/hooks/useAdminDashboardPage.ts`
- Modify: `frontend/src/pages/admin-dashboard/utils/adminDashboard.ts`
- Modify: `frontend/tests/unit/domain/analysis/admin-range-report-adapter.unit.test.ts`
- Modify: `frontend/tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts`

**Interfaces:**
- Consumes: `ReportRow` from `frontend/src/pages/admin-dashboard/types.ts`
- Produces: `ReportChartPoint`
- Produces: `ReportChart`
- Produces: `ReportSection.charts?: ReportChart[]`
- Produces: `ReportInspectionEvidenceItem.inspectorLabel?: string`
- Produces: neutral admin section ids `report-graphs` and `pork-gallery`
- Produces: `ReportRow.imageUrl: string | null`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/tests/unit/domain/analysis/admin-range-report-adapter.unit.test.ts
test("buildAdminRangeReportModel adds graph payloads and every real pork image candidate", () => {
  const model = buildAdminRangeReportModel({
    reportOrganization: "dti",
    reportStartDate: "2026-08-01",
    reportEndDate: "2026-08-03",
    generatedAt: "Aug 3, 2026 10:40 AM",
    generatedBy: "admin@example.com",
    summary: {
      total: 4,
      averageConfidence: 89,
      spoiledRate: 25,
      uniqueInspectors: 2,
      uniqueLocations: 2,
      flaggedRecords: 1,
    },
    reportRows: [
      {
        createdAt: "2026-08-03 10:00:00",
        capturedAt: "2026-08-03 10:00:00",
        inspector: "Inspector One",
        location: "East Market",
        meatType: "pork",
        classification: "warning",
        confidenceScore: 88,
        imageUrl: "https://example.com/pork-latest.jpg",
      },
      {
        createdAt: "2026-08-02 08:00:00",
        capturedAt: "2026-08-02 08:00:00",
        inspector: "Inspector Two",
        location: "West Market",
        meatType: "pork",
        classification: "fresh",
        confidenceScore: 92,
        imageUrl: "https://example.com/pork-earlier.jpg",
      },
      {
        createdAt: "2026-08-01 09:00:00",
        capturedAt: null,
        inspector: "Inspector Three",
        location: "West Market",
        meatType: "pork",
        classification: "fresh",
        confidenceScore: 90,
        imageUrl: null,
      },
      {
        createdAt: "2026-08-01 07:30:00",
        capturedAt: "2026-08-01 07:30:00",
        inspector: "Inspector Four",
        location: "Fish Market",
        meatType: "fish",
        classification: "acceptable",
        confidenceScore: 84,
        imageUrl: "https://example.com/fish.jpg",
      },
    ],
  });

  const graphSection = model.sections.find((section) => section.id === "report-graphs");
  const porkGallery = model.sections.find((section) => section.id === "pork-gallery");

  assert.ok(graphSection?.charts);
  assert.equal(graphSection?.charts?.length, 3);
  assert.deepEqual(
    graphSection?.charts?.map((chart) => chart.title),
    [
      "Classification Breakdown",
      "Daily Inspection Trend",
      "Meat Type Breakdown",
    ],
  );

  assert.ok(porkGallery?.inspectionEvidence);
  assert.deepEqual(
    porkGallery?.inspectionEvidence?.map((item) => item.imageUrl),
    [
      "https://example.com/pork-latest.jpg",
      "https://example.com/pork-earlier.jpg",
    ],
  );
  assert.deepEqual(
    porkGallery?.inspectionEvidence?.map((item) => item.inspectorLabel),
    ["Inspector One", "Inspector Two"],
  );
});
```

```ts
// frontend/tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts
test("buildAdminDashboardReportPdfModel preserves graph payloads and nullable pork image urls", () => {
  const model = buildAdminDashboardReportPdfModel({
    reportOrganization: "city_veterinary_office_olongapo",
    reportStartDate: "2026-08-01",
    reportEndDate: "2026-08-03",
    generatedAt: "Aug 3, 2026 10:40 AM",
    generatedBy: "admin@example.com",
    reportSummary: {
      total: 2,
      averageConfidence: 90,
      spoiledRate: 0,
      uniqueInspectors: 2,
      uniqueLocations: 2,
      flaggedRecords: 0,
    },
    reportRows: [
      {
        id: "inspection-1",
        createdAt: "2026-08-03T10:00:00.000Z",
        capturedAt: null,
        inspector: "A. Reyes",
        inspectorEmail: "a.reyes@example.com",
        inspectorCode: "INSP-01",
        manualLocation: "East Tapinac",
        location: "East Tapinac | Lat: 14.838600 | Long: 120.284200",
        locationLatitude: 14.8386,
        locationLongitude: 120.2842,
        profileLocation: "East Tapinac",
        meatType: "pork",
        classification: "fresh",
        confidenceScore: 93,
        decisionSource: "AI analysis",
        protocolSpoiledReason: "-",
        stallNumber: "12-A",
        certificateProof: "CERT-01",
        meatExpiryDate: "2026-08-05",
        storageCorrect: "Yes",
        lightColorCorrect: "Yes",
        lightColorObserved: "-",
        areaClean: "Yes",
        flaggedDeviations: "-",
        explanation: "Looks good",
        inspectorNotes: "Routine check",
        imageUrl: "https://example.com/city-vet-pork.jpg",
      },
      {
        id: "inspection-2",
        createdAt: "2026-08-02T08:00:00.000Z",
        capturedAt: null,
        inspector: "B. Cruz",
        inspectorEmail: "b.cruz@example.com",
        inspectorCode: "INSP-02",
        manualLocation: "West Tapinac",
        location: "West Tapinac | Lat: 14.838100 | Long: 120.284000",
        locationLatitude: 14.8381,
        locationLongitude: 120.284,
        profileLocation: "West Tapinac",
        meatType: "pork",
        classification: "warning",
        confidenceScore: 87,
        decisionSource: "AI analysis",
        protocolSpoiledReason: "-",
        stallNumber: "14-B",
        certificateProof: "CERT-02",
        meatExpiryDate: "2026-08-06",
        storageCorrect: "Yes",
        lightColorCorrect: "Yes",
        lightColorObserved: "-",
        areaClean: "Yes",
        flaggedDeviations: "-",
        explanation: "Review needed",
        inspectorNotes: "Second pass",
        imageUrl: null,
      },
    ],
  });

  const graphSection = model.sections.find((section) => section.id === "report-graphs");
  const porkGallery = model.sections.find((section) => section.id === "pork-gallery");

  assert.ok(graphSection?.charts);
  assert.equal(graphSection?.charts?.[0].points.length, 2);
  assert.ok(porkGallery?.inspectionEvidence);
  assert.equal(porkGallery?.inspectionEvidence?.length, 1);
  assert.equal(
    porkGallery?.inspectionEvidence?.[0].imageUrl,
    "https://example.com/city-vet-pork.jpg",
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test tests/unit/domain/analysis/admin-range-report-adapter.unit.test.ts tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts
```

Expected: FAIL because the admin report model has no `report-graphs` section, no pork gallery section, and the admin export path still normalizes `imageUrl` into plain table-only strings.

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/src/lib/reports/types.ts
export interface ReportChartPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ReportChart {
  id: string;
  title: string;
  kind: "bar" | "line";
  points: ReportChartPoint[];
  emptyState: string;
}

export interface ReportInspectionEvidenceItem {
  id: string;
  imageUrl: string | null;
  capturedAt: string;
  meatType: string;
  classification: string;
  confidenceLabel: string;
  location: string;
  inspectorLabel?: string;
}

export interface ReportSection {
  id: string;
  title: string;
  narrative?: string[];
  metrics?: ReportMetric[];
  tables?: ReportTable[];
  detailRows?: ReportDetailRow[];
  charts?: ReportChart[];
  inspectionEvidence?: ReportInspectionEvidenceItem[];
  evidenceLayout?: "photo-first";
}
```

```ts
// frontend/src/pages/admin-dashboard/types.ts
export type ReportRow = {
  id: string;
  createdAt: string;
  capturedAt: string | null;
  inspector: string;
  inspectorEmail: string;
  inspectorCode: string;
  manualLocation: string;
  location: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  profileLocation: string;
  meatType: string;
  classification: FreshnessClassification;
  confidenceScore: number;
  decisionSource: string;
  protocolSpoiledReason: string;
  stallNumber: string;
  certificateProof: string;
  meatExpiryDate: string;
  storageCorrect: string;
  lightColorCorrect: string;
  lightColorObserved: string;
  areaClean: string;
  flaggedDeviations: string;
  explanation: string;
  inspectorNotes: string;
  imageUrl: string | null;
};
```

```ts
// frontend/src/pages/admin-dashboard/hooks/useAdminDashboardPage.ts
const reportRows = useMemo<ReportRow[]>(() => {
  return reportFilteredInspections.map((inspection) => {
    const profile = inspection.user_id ? profileById.get(inspection.user_id) : undefined;
    const manualLocation = getLocationLabel(inspection.location, profile);
    const locationLabel =
      formatInspectionLocationLabel(
        manualLocation,
        inspection.location_latitude,
        inspection.location_longitude,
      ) || manualLocation;
    const preScanFields = buildPreScanReportFields(inspection);

    return {
      id: inspection.id,
      createdAt: inspection.created_at,
      capturedAt: inspection.captured_at ?? null,
      inspector: getInspectorLabel(profile),
      inspectorEmail: getOptionalText(profile?.email),
      inspectorCode: getOptionalText(profile?.inspector_code),
      manualLocation,
      location: locationLabel,
      locationLatitude: inspection.location_latitude,
      locationLongitude: inspection.location_longitude,
      profileLocation: getOptionalText(profile?.location),
      meatType: inspection.meat_type,
      classification: inspection.classification,
      confidenceScore: inspection.confidence_score,
      ...preScanFields,
      flaggedDeviations: inspection.flagged_deviations.length > 0 ? inspection.flagged_deviations.join("; ") : "-",
      explanation: getOptionalText(inspection.explanation),
      inspectorNotes: getOptionalText(inspection.inspector_notes),
      imageUrl: inspection.image_url ?? null,
    };
  });
}, [reportFilteredInspections, profileById]);
```

```ts
// frontend/src/lib/reports/adapters/adminRangeReport.ts
import { PIE_COLORS } from "@/pages/admin-dashboard/utils/adminDashboard";
import { formatReportDateTime } from "@/lib/reports/formatting";

type AdminReportRow = {
  createdAt: string;
  capturedAt: string | null;
  inspector: string;
  location: string;
  meatType: string;
  classification: string;
  confidenceScore: number;
  imageUrl: string | null;
};

function buildClassificationChart(reportRows: AdminReportRow[]): ReportChart {
  const counts = new Map<string, number>();

  for (const row of reportRows) {
    counts.set(row.classification, (counts.get(row.classification) ?? 0) + 1);
  }

  return {
    id: "classification-breakdown",
    title: "Classification Breakdown",
    kind: "bar",
    emptyState: "No data for selected range",
    points: ["fresh", "not fresh", "acceptable", "warning", "spoiled"].map((key) => ({
      label: key,
      value: counts.get(key) ?? 0,
      color: PIE_COLORS[key as keyof typeof PIE_COLORS],
    })),
  };
}

function buildDailyTrendChart(reportRows: AdminReportRow[]): ReportChart {
  const counts = new Map<string, number>();

  for (const row of reportRows) {
    const date = row.createdAt.slice(0, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  return {
    id: "daily-inspection-trend",
    title: "Daily Inspection Trend",
    kind: "line",
    emptyState: "No data for selected range",
    points: Array.from(counts.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([label, value]) => ({ label, value })),
  };
}

function buildMeatTypeChart(reportRows: AdminReportRow[]): ReportChart {
  const counts = new Map<string, number>();

  for (const row of reportRows) {
    counts.set(row.meatType, (counts.get(row.meatType) ?? 0) + 1);
  }

  return {
    id: "meat-type-breakdown",
    title: "Meat Type Breakdown",
    kind: "bar",
    emptyState: "No data for selected range",
    points: Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([label, value]) => ({ label, value })),
  };
}

function buildPorkGallery(reportRows: AdminReportRow[]): ReportInspectionEvidenceItem[] {
  return reportRows
    .filter((row) => row.meatType === "pork" && !!row.imageUrl)
    .sort((left, right) =>
      (right.capturedAt ?? right.createdAt).localeCompare(left.capturedAt ?? left.createdAt),
    )
    .map((row, index) => ({
      id: `pork-evidence-${index + 1}`,
      imageUrl: row.imageUrl,
      capturedAt: formatReportDateTime(row.capturedAt ?? row.createdAt),
      inspectorLabel: row.inspector,
      meatType: row.meatType,
      classification: row.classification,
      confidenceLabel: `${row.confidenceScore}%`,
      location: row.location,
    }));
}

export function buildAdminRangeReportModel(
  input: BuildAdminRangeReportInput,
): ReportDocumentModel {
  const overview: ReportSection = {
    id: "org-overview",
    title: "Organization Overview",
    metrics: [
      { label: "Total Inspections", value: String(input.summary.total) },
      { label: "Average Confidence", value: `${input.summary.averageConfidence}%` },
      { label: "Spoiled Rate", value: `${input.summary.spoiledRate}%`, emphasis: "warning" },
      { label: "Unique Inspectors", value: String(input.summary.uniqueInspectors) },
      { label: "Unique Locations", value: String(input.summary.uniqueLocations) },
      { label: "Records With Deviations", value: String(input.summary.flaggedRecords) },
    ],
    detailRows: [{ label: "Generated By", value: input.generatedBy }],
  };

  const graphSection: ReportSection = {
    id: "report-graphs",
    title: "Report Graphs",
    charts: [
      buildClassificationChart(input.reportRows),
      buildDailyTrendChart(input.reportRows),
      buildMeatTypeChart(input.reportRows),
    ],
  };

  const porkEvidence = buildPorkGallery(input.reportRows);

  return {
    organization: input.reportOrganization,
    templateKey: getTemplateKeyForOrganization(input.reportOrganization),
    kind: "admin_range",
    title: "Administrative Report",
    subtitle: `Range: ${input.reportStartDate} to ${input.reportEndDate}`,
    generatedAt: input.generatedAt,
    sections: [
      overview,
      buildSharedMeatSummarySection({
        totalInspections: input.summary.total,
        averageConfidence: input.summary.averageConfidence,
        spoiledRateLabel: `${input.summary.spoiledRate}%`,
      }),
      graphSection,
      ...(porkEvidence.length > 0
        ? [
            {
              id: "pork-gallery",
              title: "Pork Meat Evidence",
              inspectionEvidence: porkEvidence,
              evidenceLayout: "photo-first" as const,
            } satisfies ReportSection,
          ]
        : []),
      buildSharedMeatDetailSection({
        title: "Inspection Detail",
        columns: [
          "Created",
          "Inspector",
          "Location",
          "Meat",
          "Classification",
          "Confidence",
        ],
        rows: input.reportRows.map((row) => [
          row.createdAt,
          row.inspector,
          row.location,
          row.meatType,
          row.classification,
          `${row.confidenceScore}%`,
        ]),
      }),
    ],
  };
}
```

```ts
// frontend/src/pages/admin-dashboard/utils/adminDashboard.ts
return buildAdminRangeReportModel({
  reportOrganization: resolveReportOrganization(input.reportOrganization),
  reportStartDate: input.reportStartDate,
  reportEndDate: input.reportEndDate,
  generatedAt: input.generatedAt,
  generatedBy: input.generatedBy,
  summary: input.reportSummary,
  reportRows: input.reportRows.map((row) => ({
    createdAt: formatReportDateTime(row.createdAt),
    capturedAt: row.capturedAt ? formatReportDateTime(row.capturedAt) : null,
    inspector: row.inspector,
    location: row.location,
    meatType: row.meatType,
    classification: row.classification,
    confidenceScore: row.confidenceScore,
    imageUrl: row.imageUrl,
  })),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test tests/unit/domain/analysis/admin-range-report-adapter.unit.test.ts tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts
```

Expected: PASS with graph payloads present, pork gallery candidates restricted to real pork image rows, and nullable `imageUrl` preserved through the export model.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/reports/types.ts frontend/src/lib/reports/adapters/adminRangeReport.ts frontend/src/pages/admin-dashboard/types.ts frontend/src/pages/admin-dashboard/hooks/useAdminDashboardPage.ts frontend/src/pages/admin-dashboard/utils/adminDashboard.ts frontend/tests/unit/domain/analysis/admin-range-report-adapter.unit.test.ts frontend/tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts
git commit -m "feat: add admin pdf graph and pork sections"
```

## Task 2: Apply Organization-Specific Admin Section Ordering

**Files:**
- Create: `frontend/src/lib/reports/templates/adminSectionOrder.ts`
- Create: `frontend/tests/unit/domain/analysis/admin-report-templates.unit.test.ts`
- Modify: `frontend/src/lib/reports/templates/dtiTemplate.ts`
- Modify: `frontend/src/lib/reports/templates/cityVetTemplate.ts`
- Modify: `frontend/src/lib/reports/templates/gcccsTemplate.ts`
- Modify: `frontend/tests/unit/domain/analysis/report-template-selection.unit.test.ts`

**Interfaces:**
- Produces: `reorderAdminSections(sections: ReportSection[], order: string[]): ReportSection[]`
- Produces: DTI admin order `org-overview -> report-graphs -> pork-gallery -> meat-summary -> meat-detail`
- Produces: City Vet admin order `org-overview -> report-graphs -> pork-gallery -> meat-summary -> meat-detail`
- Produces: GCCCS admin order `org-overview -> report-graphs -> meat-summary -> meat-detail`
- Produces: DTI overview title `Market Service and Operations Overview`
- Produces: City Vet overview title `Veterinary and Meat Safety Overview`
- Produces: GCCCS overview title `Technical and System Overview`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/tests/unit/domain/analysis/admin-report-templates.unit.test.ts
import assert from "node:assert/strict";
import test from "node:test";

import { getOrganizationReportTemplate } from "../../../../src/lib/reports/templates";
import type { ReportDocumentModel } from "../../../../src/lib/reports/types";

const sampleAdminModel: ReportDocumentModel = {
  organization: "dti",
  templateKey: "dti",
  kind: "admin_range",
  title: "Administrative Report",
  subtitle: "Range: 2026-08-01 to 2026-08-03",
  generatedAt: "Aug 3, 2026 10:40 AM",
  sections: [
    { id: "org-overview", title: "Organization Overview", metrics: [{ label: "Total Inspections", value: "4" }] },
    { id: "meat-summary", title: "Meat Inspection Summary", metrics: [{ label: "Average Confidence", value: "89%" }] },
    {
      id: "report-graphs",
      title: "Report Graphs",
      charts: [
        { id: "classification-breakdown", title: "Classification Breakdown", kind: "bar", emptyState: "No data for selected range", points: [] },
      ],
    },
    {
      id: "pork-gallery",
      title: "Pork Meat Evidence",
      evidenceLayout: "photo-first",
      inspectionEvidence: [
        {
          id: "pork-1",
          imageUrl: "https://example.com/pork.jpg",
          capturedAt: "2026-08-03 10:00:00",
          inspectorLabel: "Inspector One",
          meatType: "pork",
          classification: "warning",
          confidenceLabel: "88%",
          location: "East Market",
        },
      ],
    },
    { id: "meat-detail", title: "Inspection Detail", tables: [{ title: "Inspection Detail", columns: ["Created"], rows: [["2026-08-03 10:00:00"]] }] },
  ],
};

test("dti admin template places graphs and pork gallery before the meat report", () => {
  const sections = getOrganizationReportTemplate("dti").buildSections(sampleAdminModel);

  assert.deepEqual(
    sections.map((section) => section.id),
    ["org-overview", "report-graphs", "pork-gallery", "meat-summary", "meat-detail"],
  );
  assert.equal(sections[0].title, "Market Service and Operations Overview");
});

test("city vet admin template keeps pork gallery before the meat report", () => {
  const sections = getOrganizationReportTemplate("city_vet").buildSections({
    ...sampleAdminModel,
    organization: "city_veterinary_office_olongapo",
    templateKey: "city_vet",
  });

  assert.deepEqual(
    sections.map((section) => section.id),
    ["org-overview", "report-graphs", "pork-gallery", "meat-summary", "meat-detail"],
  );
  assert.equal(sections[0].title, "Veterinary and Meat Safety Overview");
});

test("gcccs admin template drops the pork gallery and keeps graphs technical-first", () => {
  const sections = getOrganizationReportTemplate("gcccs").buildSections({
    ...sampleAdminModel,
    organization: "gordon_college_ccs",
    templateKey: "gcccs",
  });

  assert.deepEqual(
    sections.map((section) => section.id),
    ["org-overview", "report-graphs", "meat-summary", "meat-detail"],
  );
  assert.equal(sections[0].title, "Technical and System Overview");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test tests/unit/domain/analysis/report-template-selection.unit.test.ts tests/unit/domain/analysis/admin-report-templates.unit.test.ts
```

Expected: FAIL because the admin templates currently only rename the opening section and do not reorder graphs or drop the GCCCS pork gallery.

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/src/lib/reports/templates/adminSectionOrder.ts
import type { ReportSection } from "@/lib/reports/types";

export function reorderAdminSections(
  sections: ReportSection[],
  order: string[],
): ReportSection[] {
  const sectionMap = new Map(sections.map((section) => [section.id, section]));

  return order.flatMap((id) => {
    const section = sectionMap.get(id);
    if (!section) return [];
    if (id === "pork-gallery" && (section.inspectionEvidence?.length ?? 0) === 0) {
      return [];
    }
    return [section];
  });
}
```

```ts
// frontend/src/lib/reports/templates/dtiTemplate.ts
import { reorderAdminSections } from "@/lib/reports/templates/adminSectionOrder";

function mapDtiAdminSections(sections: ReportSection[]): ReportSection[] {
  const renamedSections = sections.map((section) => {
    if (section.id === "org-overview") {
      return {
        ...section,
        title: "Market Service and Operations Overview",
      };
    }

    if (section.id === "report-graphs") {
      return {
        ...section,
        title: "Operational Inspection Graphs",
      };
    }

    if (section.id === "pork-gallery") {
      return {
        ...section,
        title: "Pork Meat Field Evidence",
      };
    }

    return section;
  });

  return reorderAdminSections(renamedSections, [
    "org-overview",
    "report-graphs",
    "pork-gallery",
    "meat-summary",
    "meat-detail",
  ]);
}
```

```ts
// frontend/src/lib/reports/templates/cityVetTemplate.ts
import { reorderAdminSections } from "@/lib/reports/templates/adminSectionOrder";

function mapCityVetAdminSections(sections: ReportSection[]): ReportSection[] {
  const renamedSections = sections.map((section) => {
    if (section.id === "org-overview") {
      return {
        ...section,
        title: "Veterinary and Meat Safety Overview",
      };
    }

    if (section.id === "report-graphs") {
      return {
        ...section,
        title: "Veterinary Inspection Graphs",
      };
    }

    if (section.id === "pork-gallery") {
      return {
        ...section,
        title: "Pork Meat Veterinary Evidence",
      };
    }

    return section;
  });

  return reorderAdminSections(renamedSections, [
    "org-overview",
    "report-graphs",
    "pork-gallery",
    "meat-summary",
    "meat-detail",
  ]);
}
```

```ts
// frontend/src/lib/reports/templates/gcccsTemplate.ts
import { reorderAdminSections } from "@/lib/reports/templates/adminSectionOrder";

function mapGcccsAdminSections(sections: ReportSection[]): ReportSection[] {
  const renamedSections = sections
    .filter((section) => section.id !== "pork-gallery")
    .map((section) => {
      if (section.id === "org-overview") {
        return {
          ...section,
          title: "Technical and System Overview",
        };
      }

      if (section.id === "report-graphs") {
        return {
          ...section,
          title: "Technical Inspection Graphs",
        };
      }

      return section;
    });

  return reorderAdminSections(renamedSections, [
    "org-overview",
    "report-graphs",
    "meat-summary",
    "meat-detail",
  ]);
}
```

```ts
// frontend/tests/unit/domain/analysis/report-template-selection.unit.test.ts
test("gcccs template places the technical overview before graphs and meat sections", () => {
  const template = getOrganizationReportTemplate("gcccs");
  const sections = template.buildSections({
    ...sampleModel,
    sections: [
      sampleModel.sections[0],
      {
        id: "report-graphs",
        title: "Report Graphs",
        charts: [
          {
            id: "classification-breakdown",
            title: "Classification Breakdown",
            kind: "bar",
            emptyState: "No data for selected range",
            points: [],
          },
        ],
      },
      sampleModel.sections[1],
    ],
  });

  assert.deepEqual(
    sections.map((section) => section.id),
    ["org-overview", "report-graphs", "meat-summary"],
  );
  assert.equal(sections[0].title, "Technical and System Overview");
});
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test tests/unit/domain/analysis/report-template-selection.unit.test.ts tests/unit/domain/analysis/admin-report-templates.unit.test.ts
```

Expected: PASS with DTI and City Vet ordering graphs and pork gallery before the meat report, while GCCCS stays technical-first and omits the pork gallery.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/reports/templates/adminSectionOrder.ts frontend/src/lib/reports/templates/dtiTemplate.ts frontend/src/lib/reports/templates/cityVetTemplate.ts frontend/src/lib/reports/templates/gcccsTemplate.ts frontend/tests/unit/domain/analysis/admin-report-templates.unit.test.ts frontend/tests/unit/domain/analysis/report-template-selection.unit.test.ts
git commit -m "feat: order admin report sections by organization"
```

## Task 3: Render PDF-Specific Graph Sections With Empty States

**Files:**
- Create: `frontend/src/lib/reports/pdf/reportCharts.ts`
- Modify: `frontend/src/lib/reports/pdf/buildDocDefinition.ts`
- Modify: `frontend/tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts`

**Interfaces:**
- Produces: `buildReportChartContent(chart: ReportChart, frame: ReportPageFrame): Content`
- Produces: `buildReportChartSvg(chart: ReportChart, frame: ReportPageFrame): string | null`
- Consumes: `ReportSection.charts?: ReportChart[]`
- Produces: `report-graphs` section rendering with three chart blocks or explicit empty states

- [ ] **Step 1: Write the failing test**

```ts
// frontend/tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
test("buildReportDocDefinition renders admin graph blocks for dti exports", async () => {
  const dtiAdminModel: ReportDocumentModel = {
    organization: "dti",
    templateKey: "dti",
    kind: "admin_range",
    title: "Administrative Report",
    subtitle: "Range: 2026-08-01 to 2026-08-03",
    generatedAt: "Aug 3, 2026 10:40 AM",
    sections: [
      {
        id: "org-overview",
        title: "Organization Overview",
        metrics: [{ label: "Total Inspections", value: "4" }],
      },
      {
        id: "report-graphs",
        title: "Report Graphs",
        charts: [
          {
            id: "classification-breakdown",
            title: "Classification Breakdown",
            kind: "bar",
            emptyState: "No data for selected range",
            points: [
              { label: "fresh", value: 2, color: "#22C55E" },
              { label: "warning", value: 1, color: "#F97316" },
            ],
          },
          {
            id: "daily-inspection-trend",
            title: "Daily Inspection Trend",
            kind: "line",
            emptyState: "No data for selected range",
            points: [
              { label: "2026-08-01", value: 1 },
              { label: "2026-08-02", value: 2 },
            ],
          },
          {
            id: "meat-type-breakdown",
            title: "Meat Type Breakdown",
            kind: "bar",
            emptyState: "No data for selected range",
            points: [{ label: "pork", value: 3 }],
          },
        ],
      },
      {
        id: "meat-summary",
        title: "Meat Inspection Summary",
        metrics: [{ label: "Average Confidence", value: "89%" }],
      },
      {
        id: "meat-detail",
        title: "Inspection Detail",
        tables: [{ title: "Inspection Detail", columns: ["Created"], rows: [["2026-08-03 10:00:00"]] }],
      },
    ],
  };

  const docDefinition = await buildReportDocDefinition(dtiAdminModel, {
    loadBrandAsset: async (path) => `mocked:${path}`,
  });

  const contentJson = JSON.stringify(docDefinition.content);
  assert.match(contentJson, /Operational Inspection Graphs/);
  assert.match(contentJson, /Classification Breakdown/);
  assert.match(contentJson, /Daily Inspection Trend/);
  assert.match(contentJson, /Meat Type Breakdown/);
  assert.match(contentJson, /<svg/);
});

test("buildReportDocDefinition keeps the graph section and shows an empty state when graph points are empty", async () => {
  const gcccsAdminModel: ReportDocumentModel = {
    organization: "gordon_college_ccs",
    templateKey: "gcccs",
    kind: "admin_range",
    title: "Administrative Report",
    subtitle: "Range: 2026-08-01 to 2026-08-03",
    generatedAt: "Aug 3, 2026 10:40 AM",
    sections: [
      {
        id: "org-overview",
        title: "Organization Overview",
        metrics: [{ label: "Total Inspections", value: "0" }],
      },
      {
        id: "report-graphs",
        title: "Report Graphs",
        charts: [
          {
            id: "classification-breakdown",
            title: "Classification Breakdown",
            kind: "bar",
            emptyState: "No data for selected range",
            points: [],
          },
        ],
      },
      {
        id: "meat-summary",
        title: "Meat Inspection Summary",
        metrics: [{ label: "Average Confidence", value: "0%" }],
      },
      {
        id: "meat-detail",
        title: "Inspection Detail",
        tables: [{ title: "Inspection Detail", columns: ["Created"], rows: [] }],
      },
    ],
  };

  const docDefinition = await buildReportDocDefinition(gcccsAdminModel, {
    loadBrandAsset: async (path) => `mocked:${path}`,
  });

  const contentJson = JSON.stringify(docDefinition.content);
  assert.match(contentJson, /Technical Inspection Graphs/);
  assert.match(contentJson, /No data for selected range/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
```

Expected: FAIL because the PDF builder currently ignores `section.charts` and has no SVG or empty-state rendering path for graphs.

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/src/lib/reports/pdf/reportCharts.ts
import type { Content } from "pdfmake/interfaces";

import type { ReportPageFrame } from "@/lib/reports/pdf/pageFrames";
import type { ReportChart } from "@/lib/reports/types";

const SVG_WIDTH = 460;
const SVG_HEIGHT = 170;
const PLOT_LEFT = 42;
const PLOT_TOP = 16;
const PLOT_WIDTH = 394;
const PLOT_HEIGHT = 118;

function escapeSvgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildBarChartSvg(chart: ReportChart, frame: ReportPageFrame): string {
  const maxValue = Math.max(...chart.points.map((point) => point.value), 1);
  const barWidth = Math.max(24, Math.floor(PLOT_WIDTH / Math.max(chart.points.length, 1)) - 18);

  const bars = chart.points.map((point, index) => {
    const height = Math.round((point.value / maxValue) * PLOT_HEIGHT);
    const x = PLOT_LEFT + index * (barWidth + 18);
    const y = PLOT_TOP + (PLOT_HEIGHT - height);
    const fill = point.color ?? frame.sectionColor;

    return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="4" fill="${fill}" />
      <text x="${x + barWidth / 2}" y="${PLOT_TOP + PLOT_HEIGHT + 18}" font-size="10" text-anchor="middle" fill="${frame.bodyColor}">
        ${escapeSvgText(point.label)}
      </text>
      <text x="${x + barWidth / 2}" y="${y - 6}" font-size="10" text-anchor="middle" fill="${frame.bodyColor}">
        ${point.value}
      </text>
    `;
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}">
      <line x1="${PLOT_LEFT}" y1="${PLOT_TOP + PLOT_HEIGHT}" x2="${PLOT_LEFT + PLOT_WIDTH}" y2="${PLOT_TOP + PLOT_HEIGHT}" stroke="#CBD5E1" />
      ${bars.join("")}
    </svg>
  `;
}

function buildLineChartSvg(chart: ReportChart, frame: ReportPageFrame): string {
  const maxValue = Math.max(...chart.points.map((point) => point.value), 1);
  const stepX = chart.points.length > 1 ? PLOT_WIDTH / (chart.points.length - 1) : 0;

  const coordinates = chart.points.map((point, index) => {
    const x = PLOT_LEFT + index * stepX;
    const y = PLOT_TOP + PLOT_HEIGHT - Math.round((point.value / maxValue) * PLOT_HEIGHT);
    return { x, y, point };
  });

  const path = coordinates
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}">
      <line x1="${PLOT_LEFT}" y1="${PLOT_TOP + PLOT_HEIGHT}" x2="${PLOT_LEFT + PLOT_WIDTH}" y2="${PLOT_TOP + PLOT_HEIGHT}" stroke="#CBD5E1" />
      <path d="${path}" fill="none" stroke="${frame.sectionColor}" stroke-width="3" />
      ${coordinates.map(({ x, y, point }) => `
        <circle cx="${x}" cy="${y}" r="4" fill="${frame.sectionColor}" />
        <text x="${x}" y="${PLOT_TOP + PLOT_HEIGHT + 18}" font-size="10" text-anchor="middle" fill="${frame.bodyColor}">
          ${escapeSvgText(point.label)}
        </text>
      `).join("")}
    </svg>
  `;
}

export function buildReportChartSvg(
  chart: ReportChart,
  frame: ReportPageFrame,
): string | null {
  if (chart.points.length === 0 || chart.points.every((point) => point.value === 0)) {
    return null;
  }

  return chart.kind === "line"
    ? buildLineChartSvg(chart, frame)
    : buildBarChartSvg(chart, frame);
}

export function buildReportChartContent(
  chart: ReportChart,
  frame: ReportPageFrame,
): Content {
  const svg = buildReportChartSvg(chart, frame);

  return {
    stack: [
      {
        text: chart.title,
        style: "tableTitle",
        margin: [0, 0, 0, 6],
      },
      svg
        ? {
            svg,
            width: SVG_WIDTH,
            margin: [0, 0, 0, 12],
          }
        : {
            text: chart.emptyState,
            style: "detailValue",
            italics: true,
            margin: [0, 6, 0, 12],
          },
    ],
    margin: [0, 0, 0, 8],
    unbreakable: true,
  };
}
```

```ts
// frontend/src/lib/reports/pdf/buildDocDefinition.ts
import { buildReportChartContent } from "@/lib/reports/pdf/reportCharts";

async function buildSectionBlock(
  section: ReportSection,
  sectionColor: string,
  frame: ReturnType<typeof getReportPageFrame>,
  loadInspectionImageAsset: (
    path: string | null | undefined,
  ) => Promise<string | null>,
): Promise<Content> {
  const sectionContent: Content[] = [
    {
      text: section.title,
      style: "sectionTitle",
      margin: [0, 0, 0, 8],
    },
  ];

  for (const paragraph of section.narrative ?? []) {
    sectionContent.push({
      text: paragraph,
      style: "narrative",
      margin: [0, 0, 0, 8],
    });
  }

  if ((section.metrics?.length ?? 0) > 0) {
    sectionContent.push(buildMetricGrid(section.metrics ?? []));
  }

  if ((section.detailRows?.length ?? 0) > 0) {
    sectionContent.push(buildDetailRowTable(section.detailRows ?? [], frame));
  }

  for (const chart of section.charts ?? []) {
    sectionContent.push(buildReportChartContent(chart, frame));
  }

  if (
    section.evidenceLayout === "photo-first" &&
    (section.inspectionEvidence?.length ?? 0) > 0
  ) {
    sectionContent.push(
      ...(await buildInspectionEvidenceContent(
        section.inspectionEvidence ?? [],
        frame,
        loadInspectionImageAsset,
      )),
    );
  }

  for (const table of section.tables ?? []) {
    sectionContent.push(buildReportTable(table, frame));
  }

  return {
    stack: sectionContent,
    margin: [0, 0, 0, 18],
    unbreakable: false,
    fillColor: "#FFFFFF",
    color: sectionColor,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
```

Expected: PASS with graph titles rendered into the admin PDF content, SVG-backed graph blocks present when points exist, and plain no-data states shown when chart points are empty.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/reports/pdf/reportCharts.ts frontend/src/lib/reports/pdf/buildDocDefinition.ts frontend/tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
git commit -m "feat: render admin pdf graphs"
```

## Task 4: Render DTI And City Vet Pork Gallery Cards In The Shared PDF Builder

**Files:**
- Modify: `frontend/src/lib/reports/pdf/buildDocDefinition.ts`
- Modify: `frontend/tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts`

**Interfaces:**
- Consumes: `ReportInspectionEvidenceItem.inspectorLabel?: string`
- Produces: photo-first pork gallery cards that render newest-first image evidence for DTI and City Vet
- Produces: distinct gallery states for `No image captured` and `Inspection image unavailable`
- Produces: GCCCS admin doc definitions that do not load pork gallery images

- [ ] **Step 1: Write the failing test**

```ts
// frontend/tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
test("buildReportDocDefinition renders all dti pork gallery images with inspector metadata", async () => {
  const requestedImages: string[] = [];
  const dtiAdminModel: ReportDocumentModel = {
    organization: "dti",
    templateKey: "dti",
    kind: "admin_range",
    title: "Administrative Report",
    subtitle: "Range: 2026-08-01 to 2026-08-03",
    generatedAt: "Aug 3, 2026 10:40 AM",
    sections: [
      {
        id: "org-overview",
        title: "Organization Overview",
        metrics: [{ label: "Total Inspections", value: "2" }],
      },
      {
        id: "report-graphs",
        title: "Report Graphs",
        charts: [],
      },
      {
        id: "pork-gallery",
        title: "Pork Meat Evidence",
        evidenceLayout: "photo-first",
        inspectionEvidence: [
          {
            id: "pork-1",
            imageUrl: "https://example.com/latest.jpg",
            capturedAt: "2026-08-03 10:00:00",
            inspectorLabel: "Inspector One",
            meatType: "pork",
            classification: "warning",
            confidenceLabel: "88%",
            location: "East Market",
          },
          {
            id: "pork-2",
            imageUrl: "https://example.com/earlier.jpg",
            capturedAt: "2026-08-02 08:00:00",
            inspectorLabel: "Inspector Two",
            meatType: "pork",
            classification: "fresh",
            confidenceLabel: "92%",
            location: "West Market",
          },
        ],
      },
      {
        id: "meat-summary",
        title: "Meat Inspection Summary",
        metrics: [{ label: "Average Confidence", value: "90%" }],
      },
      {
        id: "meat-detail",
        title: "Inspection Detail",
        tables: [{ title: "Inspection Detail", columns: ["Created"], rows: [["2026-08-03 10:00:00"]] }],
      },
    ],
  };

  const docDefinition = await buildReportDocDefinition(dtiAdminModel, {
    loadBrandAsset: async (path) => `mocked:${path}`,
    loadInspectionImageAsset: async (path) => {
      requestedImages.push(String(path));
      return `data:image/png;base64,${path}`;
    },
  });

  assert.deepEqual(requestedImages, [
    "https://example.com/latest.jpg",
    "https://example.com/earlier.jpg",
  ]);
  const contentJson = JSON.stringify(docDefinition.content);
  assert.match(contentJson, /Pork Meat Field Evidence/);
  assert.match(contentJson, /Inspector One/);
  assert.match(contentJson, /Inspector Two/);
});

test("buildReportDocDefinition keeps a city vet pork gallery card when the image fails to load", async () => {
  const cityVetAdminModel: ReportDocumentModel = {
    organization: "city_veterinary_office_olongapo",
    templateKey: "city_vet",
    kind: "admin_range",
    title: "Administrative Report",
    subtitle: "Range: 2026-08-01 to 2026-08-03",
    generatedAt: "Aug 3, 2026 10:40 AM",
    sections: [
      {
        id: "org-overview",
        title: "Organization Overview",
        metrics: [{ label: "Total Inspections", value: "1" }],
      },
      {
        id: "report-graphs",
        title: "Report Graphs",
        charts: [],
      },
      {
        id: "pork-gallery",
        title: "Pork Meat Evidence",
        evidenceLayout: "photo-first",
        inspectionEvidence: [
          {
            id: "pork-1",
            imageUrl: "https://example.com/city-vet.jpg",
            capturedAt: "2026-08-03 10:00:00",
            inspectorLabel: "Inspector One",
            meatType: "pork",
            classification: "warning",
            confidenceLabel: "88%",
            location: "East Market",
          },
        ],
      },
      {
        id: "meat-summary",
        title: "Meat Inspection Summary",
        metrics: [{ label: "Average Confidence", value: "88%" }],
      },
      {
        id: "meat-detail",
        title: "Inspection Detail",
        tables: [{ title: "Inspection Detail", columns: ["Created"], rows: [["2026-08-03 10:00:00"]] }],
      },
    ],
  };

  const docDefinition = await buildReportDocDefinition(cityVetAdminModel, {
    loadBrandAsset: async (path) => `mocked:${path}`,
    loadInspectionImageAsset: async () => {
      throw new Error("asset failed");
    },
  });

  const contentJson = JSON.stringify(docDefinition.content);
  assert.match(contentJson, /Pork Meat Veterinary Evidence/);
  assert.match(contentJson, /Inspection image unavailable/);
  assert.match(contentJson, /Inspector One/);
});

test("buildReportDocDefinition keeps gcccs admin exports free of pork gallery images", async () => {
  const requestedImages: string[] = [];
  const gcccsAdminModel: ReportDocumentModel = {
    organization: "gordon_college_ccs",
    templateKey: "gcccs",
    kind: "admin_range",
    title: "Administrative Report",
    subtitle: "Range: 2026-08-01 to 2026-08-03",
    generatedAt: "Aug 3, 2026 10:40 AM",
    sections: [
      {
        id: "org-overview",
        title: "Organization Overview",
        metrics: [{ label: "Total Inspections", value: "1" }],
      },
      {
        id: "report-graphs",
        title: "Report Graphs",
        charts: [],
      },
      {
        id: "pork-gallery",
        title: "Pork Meat Evidence",
        evidenceLayout: "photo-first",
        inspectionEvidence: [
          {
            id: "pork-1",
            imageUrl: "https://example.com/should-not-load.jpg",
            capturedAt: "2026-08-03 10:00:00",
            inspectorLabel: "Inspector One",
            meatType: "pork",
            classification: "warning",
            confidenceLabel: "88%",
            location: "East Market",
          },
        ],
      },
      {
        id: "meat-summary",
        title: "Meat Inspection Summary",
        metrics: [{ label: "Average Confidence", value: "88%" }],
      },
      {
        id: "meat-detail",
        title: "Inspection Detail",
        tables: [{ title: "Inspection Detail", columns: ["Created"], rows: [["2026-08-03 10:00:00"]] }],
      },
    ],
  };

  await buildReportDocDefinition(gcccsAdminModel, {
    loadBrandAsset: async (path) => `mocked:${path}`,
    loadInspectionImageAsset: async (path) => {
      requestedImages.push(String(path));
      return `data:image/png;base64,${path}`;
    },
  });

  assert.deepEqual(requestedImages, []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
```

Expected: FAIL because the current photo-first evidence renderer does not include inspector metadata for admin gallery cards, and the admin doc-definition path is not yet verified against GCCCS pork-gallery omission.

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/src/lib/reports/pdf/buildDocDefinition.ts
function buildInspectionEvidenceField(
  label: string,
  value: string,
): Content {
  return {
    stack: [
      {
        text: label,
        style: "detailLabel",
        margin: [0, 0, 0, 2],
      },
      {
        text: value,
        style: "detailValue",
        margin: [0, 0, 0, 8],
      },
    ],
  };
}

async function buildInspectionEvidenceContent(
  inspectionEvidence: ReportInspectionEvidenceItem[],
  frame: ReturnType<typeof getReportPageFrame>,
  loadInspectionImageAsset: (
    path: string | null | undefined,
  ) => Promise<string | null>,
): Promise<Content[]> {
  return Promise.all(
    inspectionEvidence.map(async (evidenceItem) => {
      const imageState = await resolveInspectionImageState(
        evidenceItem.imageUrl,
        loadInspectionImageAsset,
      );

      const detailFields: Content[] = [];

      if (evidenceItem.inspectorLabel) {
        detailFields.push(
          buildInspectionEvidenceField("Inspector", evidenceItem.inspectorLabel),
        );
      }

      detailFields.push(
        buildInspectionEvidenceField("Captured", evidenceItem.capturedAt),
        buildInspectionEvidenceField("Meat", evidenceItem.meatType),
        buildInspectionEvidenceField("Classification", evidenceItem.classification),
        buildInspectionEvidenceField("Confidence", evidenceItem.confidenceLabel),
        buildInspectionEvidenceField("Location", evidenceItem.location),
      );

      return {
        stack: [
          {
            columns: [
              {
                width: 220,
                margin: [0, 0, 14, 0],
                stack: imageState.kind === "loaded"
                  ? [
                      {
                        image: imageState.dataUrl,
                        fit: [220, 170],
                        alignment: "center",
                        margin: [0, 0, 0, 6],
                      },
                    ]
                  : buildInspectionImagePlaceholder(imageState.kind),
              },
              {
                width: "*",
                stack: detailFields,
              },
            ],
            columnGap: 12,
          },
        ],
        margin: [0, 0, 0, 12],
        unbreakable: true,
      } satisfies Content;
    }),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
```

Expected: PASS with DTI and City Vet pork gallery cards rendering inspector metadata, image assets, and unavailable-image states while GCCCS keeps the admin export free of pork gallery image loading.

Run:

```bash
npx tsx --test tests/unit/domain/analysis/admin-range-report-adapter.unit.test.ts tests/unit/domain/analysis/admin-report-pdf-export.unit.test.ts tests/unit/domain/analysis/admin-report-templates.unit.test.ts tests/unit/domain/analysis/report-template-selection.unit.test.ts tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
```

Expected: PASS.

Run:

```bash
npm run typecheck
```

Expected: PASS.

Run:

```bash
npm run test:unit
```

Expected: PASS.

Run:

```bash
npm run build:dev
```

Expected: PASS.

Run:

```bash
npm run dev
```

Expected: the local app starts. In a browser session, export one DTI admin PDF, one City Vet admin PDF, and one GCCCS admin PDF using a date range with real pork inspections. Render the downloaded files to PNGs with:

```bash
pdftoppm -png "<downloaded-dti-admin-pdf>" output/pdf/dti-admin-qa
pdftoppm -png "<downloaded-city-vet-admin-pdf>" output/pdf/city-vet-admin-qa
pdftoppm -png "<downloaded-gcccs-admin-pdf>" output/pdf/gcccs-admin-qa
```

Confirm:

- DTI and City Vet show all real pork image cards for the selected range
- graphs appear in the approved order
- GCCCS shows graphs but no pork gallery
- graph empty states remain readable on empty ranges
- pork evidence cards stay readable across page breaks

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/reports/pdf/buildDocDefinition.ts frontend/tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
git commit -m "feat: render admin pork gallery in pdfs"
```

## Self-Review

### Spec coverage

- Shared admin graph payload support is covered in Task 1.
- DTI and City Vet all-pork gallery behavior is covered in Tasks 1, 2, and 4.
- GCCCS technical-first behavior with no pork gallery is covered in Tasks 2 and 4.
- Graph rendering plus explicit no-data states are covered in Task 3.
- Frontend-only real-PDF rendering remains intact throughout the plan.

### Placeholder scan

- No `TBD`, `TODO`, or deferred implementation markers remain.
- Each task lists exact file paths, exact test commands, and concrete interface names.
- Every code-changing step includes the concrete functions, section ids, or type shapes to add or modify.

### Type consistency

- Chart payloads consistently use `ReportChart` and `ReportChartPoint`.
- Admin graph sections consistently use the `report-graphs` section id.
- Pork gallery sections consistently use the `pork-gallery` section id.
- Photo-first evidence rendering consistently uses `inspectionEvidence` plus `evidenceLayout: "photo-first"`.
- Admin pork gallery cards and inspector evidence cards consistently share `ReportInspectionEvidenceItem`, with `inspectorLabel` only used when available.

## Execution Options

Plan complete and saved to `docs/superpowers/plans/2026-08-03-admin-org-specific-graphs-pork-pdf.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
