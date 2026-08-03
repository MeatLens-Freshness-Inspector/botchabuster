# Inspector Organization-Specific Photo PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make inspector PDF exports organization-specific, with photo-first unsegmented inspection evidence for DTI and City Vet, while GCCCS gets its own compact technical inspector structure.

**Architecture:** Extend the shared inspector report model so it can carry normalized inspection evidence entries instead of only string tables. Organization templates then decide how inspector evidence is presented: DTI and City Vet keep photo-first evidence blocks, while GCCCS converts the same normalized evidence into a compact technical table. The shared PDF builder remains the single rendering engine and gains one new path for image-backed inspection evidence plus graceful missing-image fallbacks.

**Tech Stack:** TypeScript, React frontend, date-fns, pdfmake, Node test runner via `tsx --test`

## Global Constraints

- Inspector exports remain actual PDF files generated in the frontend.
- The existing organization letterhead/page-frame system remains in use.
- The new layout must be document-like, not a printed web table.
- Inspector reports must branch by organization, not just by letterhead.
- DTI inspector reports must use a DTI-specific report structure.
- City Vet inspector reports must use a City Vet-specific report structure.
- GCCCS inspector reports must use a GCCCS-specific report structure.
- DTI and City Vet must show the original unsegmented meat inspection image when real `image_url` data exists.
- The exported image must come from existing real data only.
- Use only existing real inspection data already available in the frontend.
- Do not introduce new backend endpoints or derived placeholder metrics.
- Preserve the shared meat summary, but allow evidence presentation to vary by organization.
- Missing images must fail gracefully without aborting the PDF export.
- The solution stays in the frontend real-PDF pipeline.
- Execute the work in a dedicated git worktree and keep commits small.

---

## File Structure Map

### Shared report model and adapter files

- Create: `frontend/src/lib/reports/formatting.ts`
- Modify: `frontend/src/lib/reports/types.ts`
- Modify: `frontend/src/lib/reports/adapters/inspectorDailyReport.ts`
- Modify: `frontend/src/pages/user/history/utils/historyPage.ts`
- Modify: `frontend/src/pages/admin-dashboard/utils/adminDashboard.ts`

### Inspector template files

- Create: `frontend/tests/unit/domain/analysis/inspector-report-templates.unit.test.ts`
- Modify: `frontend/src/lib/reports/templates/dtiTemplate.ts`
- Modify: `frontend/src/lib/reports/templates/cityVetTemplate.ts`
- Modify: `frontend/src/lib/reports/templates/gcccsTemplate.ts`
- Modify: `frontend/tests/unit/domain/analysis/report-template-selection.unit.test.ts`

### PDF rendering and verification files

- Create: `frontend/src/lib/reports/pdf/inspectionEvidence.ts`
- Modify: `frontend/src/lib/reports/pdf/assets.ts`
- Modify: `frontend/src/lib/reports/pdf/buildDocDefinition.ts`
- Modify: `frontend/tests/unit/domain/analysis/inspector-daily-report-adapter.unit.test.ts`
- Modify: `frontend/tests/unit/domain/analysis/history-report-pdf-export.unit.test.ts`
- Modify: `frontend/tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts`

## Task 1: Expand The Inspector Report Model And Normalize Evidence Data

**Files:**
- Create: `frontend/src/lib/reports/formatting.ts`
- Modify: `frontend/src/lib/reports/types.ts`
- Modify: `frontend/src/lib/reports/adapters/inspectorDailyReport.ts`
- Modify: `frontend/src/pages/user/history/utils/historyPage.ts`
- Modify: `frontend/src/pages/admin-dashboard/utils/adminDashboard.ts`
- Modify: `frontend/tests/unit/domain/analysis/inspector-daily-report-adapter.unit.test.ts`
- Modify: `frontend/tests/unit/domain/analysis/history-report-pdf-export.unit.test.ts`

**Interfaces:**
- Consumes: `Inspection` from `frontend/src/types/inspection.ts`
- Consumes: `formatInspectionLocationLabel(location, latitude, longitude): string`
- Produces: `formatReportDateTime(value: string | null | undefined): string`
- Produces: `ReportInspectionEvidenceItem`
- Produces: `ReportSection.inspectionEvidence?: ReportInspectionEvidenceItem[]`
- Produces: `BuildInspectorDailyReportInput.inspections` entries with `captured_at` and `image_url`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/tests/unit/domain/analysis/inspector-daily-report-adapter.unit.test.ts
test("buildInspectorDailyReportModel preserves formatted captured timestamps and unsegmented image urls", () => {
  const model = buildInspectorDailyReportModel({
    reportOrganization: "dti",
    selectedReportDay: "2026-08-01",
    generatedAt: "Aug 1, 2026 4:00 PM",
    averageConfidence: 88,
    inspections: [
      {
        id: "inspection-1",
        created_at: "2026-08-01T08:00:00.000Z",
        captured_at: "2026-08-01T08:05:30.000Z",
        meat_type: "pork",
        classification: "fresh",
        confidence_score: 88,
        location: "East Market | Lat: 14.838600 | Long: 120.284200",
        image_url: "https://example.com/unsegmented-pork.jpg",
      },
    ],
  });

  const detailSection = model.sections.find((section) => section.id === "meat-detail");
  assert.ok(detailSection?.inspectionEvidence);
  assert.equal(detailSection?.inspectionEvidence?.[0].capturedAt, "2026-08-01 08:05:30");
  assert.equal(
    detailSection?.inspectionEvidence?.[0].imageUrl,
    "https://example.com/unsegmented-pork.jpg",
  );
});
```

```ts
// frontend/tests/unit/domain/analysis/history-report-pdf-export.unit.test.ts
test("buildDetailedHistoryReportPdfModel carries captured_at fallback and image_url into inspector evidence", () => {
  const model = buildDetailedHistoryReportPdfModel({
    reportOrganization: "city_veterinary_office_olongapo",
    selectedReportDay: "2026-08-01",
    generatedAt: "Aug 2, 2026 5:00 PM",
    averageConfidence: 92,
    inspections: [
      {
        ...sampleInspection,
        captured_at: null,
        image_url: "https://example.com/city-vet-sample.jpg",
      },
    ],
  });

  const detailSection = model.sections.find((section) => section.id === "meat-detail");
  assert.ok(detailSection?.inspectionEvidence);
  assert.equal(detailSection?.inspectionEvidence?.[0].capturedAt, "2026-08-01 08:00:00");
  assert.equal(
    detailSection?.inspectionEvidence?.[0].imageUrl,
    "https://example.com/city-vet-sample.jpg",
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test frontend/tests/unit/domain/analysis/inspector-daily-report-adapter.unit.test.ts frontend/tests/unit/domain/analysis/history-report-pdf-export.unit.test.ts
```

Expected: FAIL because `inspectionEvidence` does not exist yet, `captured_at` is not part of the inspector adapter input, and timestamps still pass through as raw ISO strings.

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/src/lib/reports/formatting.ts
import { format } from "date-fns";

export const formatReportDateTime = (
  value: string | null | undefined,
): string => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : format(date, "yyyy-MM-dd HH:mm:ss");
};
```

```ts
// frontend/src/lib/reports/types.ts
export interface ReportInspectionEvidenceItem {
  id: string;
  imageUrl: string | null;
  capturedAt: string;
  meatType: string;
  classification: string;
  confidenceLabel: string;
  location: string;
}

export interface ReportSection {
  id: string;
  title: string;
  narrative?: string[];
  metrics?: ReportMetric[];
  tables?: ReportTable[];
  detailRows?: ReportDetailRow[];
  inspectionEvidence?: ReportInspectionEvidenceItem[];
  evidenceLayout?: "photo-first";
}
```

```ts
// frontend/src/lib/reports/adapters/inspectorDailyReport.ts
import { formatReportDateTime } from "@/lib/reports/formatting";

type InspectorDailyInspection = {
  id: string;
  created_at: string;
  captured_at: string | null;
  meat_type: string;
  classification: string;
  confidence_score: number;
  location: string | null;
  image_url: string | null;
};

export function buildInspectorDailyReportModel(
  input: BuildInspectorDailyReportInput,
): ReportDocumentModel {
  return {
    organization: input.reportOrganization,
    templateKey: getTemplateKeyForOrganization(input.reportOrganization),
    kind: "inspector_daily",
    title: "Inspector Daily Report",
    subtitle: `Inspection Day: ${input.selectedReportDay}`,
    generatedAt: input.generatedAt,
    sections: [
      buildSharedMeatSummarySection({
        totalInspections: input.inspections.length,
        averageConfidence: input.averageConfidence,
      }),
      {
        id: "meat-detail",
        title: "Daily Inspection Evidence",
        inspectionEvidence: input.inspections.map((inspection) => ({
          id: inspection.id,
          imageUrl: inspection.image_url,
          capturedAt: formatReportDateTime(
            inspection.captured_at ?? inspection.created_at,
          ),
          meatType: inspection.meat_type,
          classification: inspection.classification,
          confidenceLabel: `${inspection.confidence_score}%`,
          location: inspection.location ?? "-",
        })),
      },
    ],
  };
}
```

```ts
// frontend/src/pages/user/history/utils/historyPage.ts
import { buildInspectorDailyReportModel } from "@/lib/reports/adapters/inspectorDailyReport";

export function buildDetailedHistoryReportPdfModel(
  input: DetailedHistoryReportInput,
): ReportDocumentModel {
  return buildInspectorDailyReportModel({
    reportOrganization: resolveReportOrganization(input.reportOrganization),
    selectedReportDay: input.selectedReportDay,
    generatedAt: input.generatedAt,
    averageConfidence: input.averageConfidence,
    inspections: input.inspections.map((inspection) => ({
      id: inspection.id,
      created_at: inspection.created_at,
      captured_at: inspection.captured_at ?? null,
      meat_type: inspection.meat_type,
      classification: inspection.classification,
      confidence_score: inspection.confidence_score,
      location:
        formatInspectionLocationLabel(
          inspection.location,
          inspection.location_latitude,
          inspection.location_longitude,
        ) ?? inspection.location,
      image_url: inspection.image_url,
    })),
  });
}
```

```ts
// frontend/src/pages/admin-dashboard/utils/adminDashboard.ts
import { formatReportDateTime } from "@/lib/reports/formatting";

// delete the local formatReportDateTime constant and reuse the shared helper
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test frontend/tests/unit/domain/analysis/inspector-daily-report-adapter.unit.test.ts frontend/tests/unit/domain/analysis/history-report-pdf-export.unit.test.ts
```

Expected: PASS with `inspectionEvidence` populated, formatted timestamps, and `image_url` preserved.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/reports/formatting.ts frontend/src/lib/reports/types.ts frontend/src/lib/reports/adapters/inspectorDailyReport.ts frontend/src/pages/user/history/utils/historyPage.ts frontend/src/pages/admin-dashboard/utils/adminDashboard.ts frontend/tests/unit/domain/analysis/inspector-daily-report-adapter.unit.test.ts frontend/tests/unit/domain/analysis/history-report-pdf-export.unit.test.ts
git commit -m "feat: normalize inspector pdf evidence data"
```

## Task 2: Apply Real Organization-Specific Inspector Templates

**Files:**
- Create: `frontend/tests/unit/domain/analysis/inspector-report-templates.unit.test.ts`
- Modify: `frontend/src/lib/reports/templates/dtiTemplate.ts`
- Modify: `frontend/src/lib/reports/templates/cityVetTemplate.ts`
- Modify: `frontend/src/lib/reports/templates/gcccsTemplate.ts`
- Modify: `frontend/tests/unit/domain/analysis/report-template-selection.unit.test.ts`

**Interfaces:**
- Consumes: `getOrganizationReportTemplate(templateKey): OrganizationReportTemplate`
- Consumes: `ReportSection.inspectionEvidence?: ReportInspectionEvidenceItem[]`
- Produces: DTI inspector section title `Market Field Inspection Evidence`
- Produces: City Vet inspector section title `Veterinary Inspection Evidence`
- Produces: GCCCS inspector section title `Technical Inspection Evidence Log`
- Produces: GCCCS inspector `meat-detail` section as `tables`, not `inspectionEvidence`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/tests/unit/domain/analysis/inspector-report-templates.unit.test.ts
const sampleInspectorModel: ReportDocumentModel = {
  organization: "dti",
  templateKey: "dti",
  kind: "inspector_daily",
  title: "Inspector Daily Report",
  subtitle: "Inspection Day: 2026-08-01",
  generatedAt: "Aug 2, 2026 5:00 PM",
  sections: [
    {
      id: "meat-summary",
      title: "Meat Inspection Summary",
      metrics: [{ label: "Total Inspections", value: "1" }],
    },
    {
      id: "meat-detail",
      title: "Daily Inspection Evidence",
      inspectionEvidence: [
        {
          id: "inspection-1",
          imageUrl: "https://example.com/unsegmented.jpg",
          capturedAt: "2026-08-01 08:05:30",
          meatType: "pork",
          classification: "fresh",
          confidenceLabel: "88%",
          location: "East Market",
        },
      ],
    },
  ],
};

test("dti inspector template keeps photo-first evidence and renames the evidence section", () => {
  const sections = getOrganizationReportTemplate("dti").buildSections(sampleInspectorModel);
  const detailSection = sections.find((section) => section.id === "meat-detail");
  assert.equal(detailSection?.title, "Market Field Inspection Evidence");
  assert.equal(detailSection?.evidenceLayout, "photo-first");
  assert.ok(detailSection?.inspectionEvidence);
});

test("gcccs inspector template converts normalized evidence into a compact technical table", () => {
  const gcccsModel = {
    ...sampleInspectorModel,
    organization: "gordon_college_ccs" as const,
    templateKey: "gcccs" as const,
  };

  const sections = getOrganizationReportTemplate("gcccs").buildSections(gcccsModel);
  const detailSection = sections.find((section) => section.id === "meat-detail");
  assert.equal(detailSection?.title, "Technical Inspection Evidence Log");
  assert.equal(detailSection?.inspectionEvidence, undefined);
  assert.equal(detailSection?.tables?.[0].rows[0][0], "2026-08-01 08:05:30");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test frontend/tests/unit/domain/analysis/report-template-selection.unit.test.ts frontend/tests/unit/domain/analysis/inspector-report-templates.unit.test.ts
```

Expected: FAIL because inspector templates currently pass through the same generic section structure for all organizations.

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/src/lib/reports/templates/dtiTemplate.ts
function mapDtiInspectorSections(sections: ReportSection[]): ReportSection[] {
  return sections.map((section) =>
    section.id === "meat-detail"
      ? {
          ...section,
          title: "Market Field Inspection Evidence",
          evidenceLayout: "photo-first",
        }
      : section,
  );
}

export const dtiTemplate = {
  key: "dti" satisfies ReportTemplateKey,
  displayName: "DTI",
  buildSections(model: ReportDocumentModel): ReportSection[] {
    if (model.kind === "inspector_daily") {
      return mapDtiInspectorSections(model.sections);
    }

    return model.kind === "admin_range"
      ? [
          {
            ...model.sections[0],
            id: "org-overview",
            title: "Market Service and Operations Overview",
          },
          ...model.sections.slice(1),
        ]
      : model.sections;
  },
};
```

```ts
// frontend/src/lib/reports/templates/cityVetTemplate.ts
function mapCityVetInspectorSections(sections: ReportSection[]): ReportSection[] {
  return sections.map((section) =>
    section.id === "meat-detail"
      ? {
          ...section,
          title: "Veterinary Inspection Evidence",
          evidenceLayout: "photo-first",
        }
      : section,
  );
}
```

```ts
// frontend/src/lib/reports/templates/gcccsTemplate.ts
function toGcccsInspectorEvidenceTable(section: ReportSection): ReportSection {
  if (section.id !== "meat-detail" || !section.inspectionEvidence) {
    return section;
  }

  return {
    id: "meat-detail",
    title: "Technical Inspection Evidence Log",
    tables: [
      {
        title: "Inspection Evidence Log",
        columns: [
          "Captured",
          "Meat",
          "Classification",
          "Confidence",
          "Location",
        ],
        rows: section.inspectionEvidence.map((item) => [
          item.capturedAt,
          item.meatType,
          item.classification,
          item.confidenceLabel,
          item.location,
        ]),
      },
    ],
  };
}

export const gcccsTemplate = {
  key: "gcccs" satisfies ReportTemplateKey,
  displayName: "Gordon College CCS",
  buildSections(model: ReportDocumentModel): ReportSection[] {
    if (model.kind === "inspector_daily") {
      return model.sections.map(toGcccsInspectorEvidenceTable);
    }

    return model.kind === "admin_range"
      ? [
          {
            ...model.sections[0],
            id: "org-overview",
            title: "Technical and System Overview",
          },
          ...model.sections.slice(1),
        ]
      : model.sections;
  },
};
```

Update `frontend/tests/unit/domain/analysis/report-template-selection.unit.test.ts` so the existing GCCCS admin assertion remains in place and still passes alongside the new inspector template test file.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test frontend/tests/unit/domain/analysis/report-template-selection.unit.test.ts frontend/tests/unit/domain/analysis/inspector-report-templates.unit.test.ts
```

Expected: PASS with DTI and City Vet marked as photo-first and GCCCS converted to a compact technical table.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/reports/templates/dtiTemplate.ts frontend/src/lib/reports/templates/cityVetTemplate.ts frontend/src/lib/reports/templates/gcccsTemplate.ts frontend/tests/unit/domain/analysis/report-template-selection.unit.test.ts frontend/tests/unit/domain/analysis/inspector-report-templates.unit.test.ts
git commit -m "feat: branch inspector pdf sections by organization"
```

## Task 3: Render Photo-First Inspector Evidence Blocks In The Shared PDF Builder

**Files:**
- Create: `frontend/src/lib/reports/pdf/inspectionEvidence.ts`
- Modify: `frontend/src/lib/reports/pdf/assets.ts`
- Modify: `frontend/src/lib/reports/pdf/buildDocDefinition.ts`
- Modify: `frontend/tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts`

**Interfaces:**
- Consumes: `ReportSection.inspectionEvidence?: ReportInspectionEvidenceItem[]`
- Consumes: `ReportSection.evidenceLayout?: "photo-first"`
- Produces: `loadOptionalReportImageAsset(path: string | null | undefined): Promise<string | null>`
- Produces: `buildInspectionEvidenceBlocks(section: ReportSection, options: { frame: ReportPageFrame; loadEvidenceAsset: (path: string | null | undefined) => Promise<string | null>; }): Promise<Content[]>`
- Produces: `BuildReportDocDefinitionDependencies.loadEvidenceAsset?: (path: string | null | undefined) => Promise<string | null>`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
test("buildReportDocDefinition renders a dti photo-first evidence block with the unsegmented image", async () => {
  const dtiModel: ReportDocumentModel = {
    organization: "dti",
    templateKey: "dti",
    kind: "inspector_daily",
    title: "Inspector Daily Report",
    subtitle: "Inspection Day: 2026-08-01",
    generatedAt: "Aug 2, 2026 4:00 PM",
    sections: [
      {
        id: "meat-summary",
        title: "Meat Inspection Summary",
        metrics: [{ label: "Total Inspections", value: "1" }],
      },
      {
        id: "meat-detail",
        title: "Market Field Inspection Evidence",
        evidenceLayout: "photo-first",
        inspectionEvidence: [
          {
            id: "inspection-1",
            imageUrl: "https://example.com/unsegmented.jpg",
            capturedAt: "2026-08-01 08:05:30",
            meatType: "pork",
            classification: "fresh",
            confidenceLabel: "88%",
            location: "East Market",
          },
        ],
      },
    ],
  };

  const docDefinition = await buildReportDocDefinition(dtiModel, {
    loadBrandAsset: async (path) => `mocked:${path}`,
    loadEvidenceAsset: async (path) =>
      path ? `mocked-image:${path}` : null,
  });

  const contentJson = JSON.stringify(docDefinition.content);
  assert.match(contentJson, /mocked-image:https:\/\/example.com\/unsegmented\.jpg/);
  assert.match(contentJson, /2026-08-01 08:05:30/);
  assert.match(contentJson, /East Market/);
});

test("buildReportDocDefinition renders a missing-image fallback when the evidence image cannot load", async () => {
  const cityVetModel: ReportDocumentModel = {
    organization: "city_veterinary_office_olongapo",
    templateKey: "city_vet",
    kind: "inspector_daily",
    title: "Inspector Daily Report",
    subtitle: "Inspection Day: 2026-08-01",
    generatedAt: "Aug 2, 2026 4:00 PM",
    sections: [
      {
        id: "meat-summary",
        title: "Meat Inspection Summary",
        metrics: [{ label: "Total Inspections", value: "1" }],
      },
      {
        id: "meat-detail",
        title: "Veterinary Inspection Evidence",
        evidenceLayout: "photo-first",
        inspectionEvidence: [
          {
            id: "inspection-2",
            imageUrl: null,
            capturedAt: "2026-08-01 09:00:00",
            meatType: "pork",
            classification: "warning",
            confidenceLabel: "91%",
            location: "West Market",
          },
        ],
      },
    ],
  };

  const docDefinition = await buildReportDocDefinition(cityVetModel, {
    loadBrandAsset: async (path) => `mocked:${path}`,
    loadEvidenceAsset: async () => null,
  });

  const contentJson = JSON.stringify(docDefinition.content);
  assert.match(contentJson, /No image captured|Image unavailable/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test frontend/tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
```

Expected: FAIL because the shared PDF builder currently ignores `inspectionEvidence` and has no optional image loader or missing-image fallback.

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/src/lib/reports/pdf/assets.ts
async function loadAssetAsDataUrl(path: string): Promise<string> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load report asset: ${path}`);
  }

  const blob = await response.blob();

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error(`Failed to read report asset: ${path}`));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

export async function loadReportBrandAsset(path: string): Promise<string> {
  return loadAssetAsDataUrl(path);
}

export async function loadOptionalReportImageAsset(
  path: string | null | undefined,
): Promise<string | null> {
  if (!path || path === "-") return null;

  try {
    return await loadAssetAsDataUrl(path);
  } catch {
    return null;
  }
}
```

```ts
// frontend/src/lib/reports/pdf/inspectionEvidence.ts
import type { Content, ContentTable } from "pdfmake/interfaces";
import type { ReportSection } from "@/lib/reports/types";
import type { ReportPageFrame } from "@/lib/reports/pdf/pageFrames";

export async function buildInspectionEvidenceBlocks(
  section: ReportSection,
  options: {
    frame: ReportPageFrame;
    loadEvidenceAsset: (path: string | null | undefined) => Promise<string | null>;
  },
): Promise<Content[]> {
  return await Promise.all(
    (section.inspectionEvidence ?? []).map(async (item) => {
      const evidenceImage = await options.loadEvidenceAsset(item.imageUrl);
      const detailTable: ContentTable = {
        table: {
          widths: ["32%", "*"],
          body: [
            [{ text: "Captured", style: "detailLabel", fillColor: options.frame.tableHeaderFillColor }, { text: item.capturedAt, style: "detailValue" }],
            [{ text: "Meat", style: "detailLabel", fillColor: options.frame.tableHeaderFillColor }, { text: item.meatType, style: "detailValue" }],
            [{ text: "Classification", style: "detailLabel", fillColor: options.frame.tableHeaderFillColor }, { text: item.classification, style: "detailValue" }],
            [{ text: "Confidence", style: "detailLabel", fillColor: options.frame.tableHeaderFillColor }, { text: item.confidenceLabel, style: "detailValue" }],
            [{ text: "Location", style: "detailLabel", fillColor: options.frame.tableHeaderFillColor }, { text: item.location, style: "detailValue" }],
          ],
        },
        layout: {
          hLineColor: () => "#CBD5E1",
          vLineColor: () => "#CBD5E1",
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 8, 0, 0],
      };

      return {
        stack: [
          evidenceImage
            ? {
                image: evidenceImage,
                fit: [220, 160],
                alignment: "left",
                margin: [0, 0, 0, 8],
              }
            : {
                text: item.imageUrl ? "Image unavailable" : "No image captured",
                italics: true,
                color: options.frame.bodyColor,
                margin: [0, 0, 0, 8],
              },
          detailTable,
        ],
        margin: [0, 0, 0, 14],
        unbreakable: true,
      } satisfies Content;
    }),
  );
}
```

```ts
// frontend/src/lib/reports/pdf/buildDocDefinition.ts
import { loadOptionalReportImageAsset, loadReportBrandAsset } from "@/lib/reports/pdf/assets";
import { buildInspectionEvidenceBlocks } from "@/lib/reports/pdf/inspectionEvidence";

interface BuildReportDocDefinitionDependencies {
  loadBrandAsset?: (path: string) => Promise<string>;
  loadEvidenceAsset?: (path: string | null | undefined) => Promise<string | null>;
}

export async function buildReportDocDefinition(
  model: ReportDocumentModel,
  dependencies: BuildReportDocDefinitionDependencies = {},
): Promise<TDocumentDefinitions> {
  const template = getOrganizationReportTemplate(model.templateKey);
  const sections = template.buildSections(model);
  const frame = getReportPageFrame(model.templateKey);
  const loadBrandAsset = dependencies.loadBrandAsset ?? loadReportBrandAsset;
  const loadEvidenceAsset =
    dependencies.loadEvidenceAsset ?? loadOptionalReportImageAsset;
  const frameImage = await loadBrandAsset(frame.backgroundAssetPath);
  const backgroundContent =
    (frame.backgroundMaskRectangles?.length ?? 0) > 0
      ? [
          {
            image: frameImage,
            width: 612,
            height: 792,
            absolutePosition: { x: 0, y: 0 },
          },
          ...frame.backgroundMaskRectangles!.map((rectangle) => ({
            canvas: [
              {
                type: "rect" as const,
                x: rectangle.x,
                y: rectangle.y,
                w: rectangle.w,
                h: rectangle.h,
                color: rectangle.color,
              },
            ],
          })),
        ]
      : {
          image: frameImage,
          width: 612,
          height: 792,
          absolutePosition: { x: 0, y: 0 },
        };

  return {
    pageSize: "LETTER",
    pageMargins: frame.pageMargins,
    background: (() => backgroundContent) as DynamicContent,
    footer: ((currentPage, pageCount) => ({
      margin: frame.footerMargin,
      alignment: "right",
      text: `Page ${currentPage} of ${pageCount}`,
      fontSize: 8,
      color: frame.pageNumberColor,
    })) as DynamicContent,
    info: {
      title: `${model.title} - ${template.displayName}`,
      subject: model.subtitle,
      author: "BotchaBuster",
    },
    defaultStyle: {
      fontSize: 10,
      color: frame.bodyColor,
    },
    content: await buildDocumentContent(
      model,
      sections,
      frame.sectionColor,
      frame,
      loadEvidenceAsset,
    ),
    styles: {
      reportTitle: {
        fontSize: 20,
        bold: true,
        color: frame.sectionColor,
      },
      reportSubtitle: {
        fontSize: 11,
        color: frame.bodyColor,
      },
      reportMeta: {
        fontSize: 9,
        color: frame.bodyColor,
      },
      sectionTitle: {
        fontSize: 14,
        bold: true,
        color: frame.sectionColor,
      },
      narrative: {
        fontSize: 10,
        lineHeight: 1.3,
        color: frame.bodyColor,
      },
      metricLabel: {
        fontSize: 9,
        color: frame.bodyColor,
      },
      metricValue: {
        fontSize: 15,
        bold: true,
        color: frame.sectionColor,
      },
      detailLabel: {
        fontSize: 9,
        bold: true,
        color: frame.sectionColor,
      },
      detailValue: {
        fontSize: 10,
        color: frame.bodyColor,
      },
      tableTitle: {
        fontSize: 10,
        bold: true,
        color: frame.sectionColor,
      },
      tableHeader: {
        fontSize: 9,
        bold: true,
        color: frame.tableHeaderTextColor,
      },
      tableCell: {
        fontSize: 9,
        color: frame.bodyColor,
      },
    },
  };
}

async function buildDocumentContent(
  model: ReportDocumentModel,
  sections: ReportSection[],
  sectionColor: string,
  frame: ReturnType<typeof getReportPageFrame>,
  loadEvidenceAsset: (path: string | null | undefined) => Promise<string | null>,
): Promise<Content[]> {
  const content: Content[] = [
    { text: model.title, style: "reportTitle", margin: [0, 0, 0, 4] },
    { text: model.subtitle, style: "reportSubtitle", margin: [0, 0, 0, 6] },
    {
      columns: [
        { text: `Generated: ${model.generatedAt}`, style: "reportMeta" },
        {
          text: `Organization: ${getReportOrganizationLabel(model.organization)}`,
          style: "reportMeta",
          alignment: "right",
        },
      ],
      margin: [0, 0, 0, 18],
    },
  ];

  for (const section of sections) {
    content.push(
      await buildSectionBlock(
        section,
        sectionColor,
        frame,
        loadEvidenceAsset,
      ),
    );
  }

  return content;
}

async function buildSectionBlock(
  section: ReportSection,
  sectionColor: string,
  frame: ReturnType<typeof getReportPageFrame>,
  loadEvidenceAsset: (path: string | null | undefined) => Promise<string | null>,
): Promise<Content> {
  const sectionContent: Content[] = [
    {
      text: section.title,
      style: "sectionTitle",
      margin: [0, 0, 0, 8],
    },
  ];

  if ((section.inspectionEvidence?.length ?? 0) > 0) {
    sectionContent.push(
      ...(await buildInspectionEvidenceBlocks(section, {
        frame,
        loadEvidenceAsset,
      })),
    );
  }

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
npx tsx --test frontend/tests/unit/domain/analysis/inspector-daily-report-adapter.unit.test.ts frontend/tests/unit/domain/analysis/history-report-pdf-export.unit.test.ts frontend/tests/unit/domain/analysis/inspector-report-templates.unit.test.ts frontend/tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
```

Expected: PASS with DTI/City Vet evidence images rendered through the doc definition and missing-image fallbacks represented in content.

Run:

```bash
npm run test:unit -w frontend
```

Expected: PASS.

Run:

```bash
npm run build:dev -w frontend
```

Expected: PASS.

Run:

```bash
npm run dev -w frontend
```

Expected: the local app starts. In a browser session, export one DTI inspector PDF and one City Vet inspector PDF using days that already have real inspections, then render the downloaded files to PNGs with:

```bash
pdftoppm -png "<downloaded-dti-pdf>" output/pdf/dti-inspector-qa
pdftoppm -png "<downloaded-city-vet-pdf>" output/pdf/city-vet-inspector-qa
```

Confirm:

- the unsegmented meat images are visible
- timestamps are human-readable
- evidence blocks stay readable across page breaks
- GCCCS inspector export no longer looks identical to DTI/City Vet

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/reports/pdf/inspectionEvidence.ts frontend/src/lib/reports/pdf/assets.ts frontend/src/lib/reports/pdf/buildDocDefinition.ts frontend/tests/unit/domain/analysis/report-pdf-doc-definition.unit.test.ts
git commit -m "feat: render inspector photo evidence in pdf exports"
```

## Self-Review

### Spec coverage

- Organization-specific inspector branching is covered in Task 2.
- DTI and City Vet unsegmented image visibility is covered in Tasks 1 and 3.
- GCCCS inspector structure diverging from the generic shared body is covered in Task 2.
- Human-readable inspector timestamps are covered in Task 1.
- Missing-image fallbacks are covered in Task 3.
- Frontend-only real-PDF rendering remains intact throughout the plan.

### Placeholder scan

- No `TBD`, `TODO`, or deferred implementation markers remain.
- Each task lists exact file paths, exact test commands, and concrete interface names.
- Every code-changing step includes the concrete functions or type shapes to add or modify.

### Type consistency

- Shared timestamp formatting consistently uses `formatReportDateTime`.
- Inspector evidence entries consistently use `ReportInspectionEvidenceItem`.
- Photo-first rendering consistently uses `inspectionEvidence` plus `evidenceLayout: "photo-first"`.
- GCCCS consistently converts normalized inspector evidence into a `tables` section instead of adding a second inspector-only PDF pipeline.
