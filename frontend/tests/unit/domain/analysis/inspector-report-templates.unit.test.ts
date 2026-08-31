import assert from "node:assert/strict";
import test from "node:test";

import { getOrganizationReportTemplate } from "../../../../src/features/reports/lib/templates";
import type { ReportDocumentModel } from "../../../../src/features/reports/model/types";

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

test("city vet inspector template keeps photo-first evidence and renames the evidence section", () => {
  const cityVetModel: ReportDocumentModel = {
    ...sampleInspectorModel,
    organization: "city_veterinary_office_olongapo",
    templateKey: "city_vet",
  };

  const sections = getOrganizationReportTemplate("city_vet").buildSections(cityVetModel);
  const detailSection = sections.find((section) => section.id === "meat-detail");

  assert.equal(detailSection?.title, "Veterinary Inspection Evidence");
  assert.equal(detailSection?.evidenceLayout, "photo-first");
  assert.ok(detailSection?.inspectionEvidence);
});

test("gcccs inspector template converts normalized evidence into a compact technical table", () => {
  const gcccsModel: ReportDocumentModel = {
    ...sampleInspectorModel,
    organization: "gordon_college_ccs",
    templateKey: "gcccs",
    sections: [
      {
        id: "meat-detail",
        title: "Daily Inspection Evidence",
        inspectionEvidence: [
          {
            id: "inspection-beef",
            imageUrl: null,
            capturedAt: "2026-08-01 08:05:30",
            meatType: "beef",
            meatTypeScopeLabel: "Future validation / research use",
            classification: "fresh",
            confidenceLabel: "88%",
            location: "East Market",
          },
        ],
      },
    ],
  };

  const sections = getOrganizationReportTemplate("gcccs").buildSections(gcccsModel);
  const detailSection = sections.find((section) => section.id === "meat-detail");

  assert.equal(detailSection?.title, "Technical Inspection Evidence Log");
  assert.equal(detailSection?.inspectionEvidence, undefined);
  assert.deepEqual(detailSection?.tables?.[0].columns, [
    "Captured",
    "Meat",
    "Meat Type Scope",
    "Classification",
    "Confidence",
    "Location",
  ]);
  assert.equal(detailSection?.tables?.[0].rows[0][0], "2026-08-01 08:05:30");
  assert.equal(detailSection?.tables?.[0].rows[0][2], "Future validation / research use");
});

// commit 11
test("dti inspector template renames report-graphs to Operational Inspection Graphs", () => {
  const modelWithGraphs: ReportDocumentModel = {
    ...sampleInspectorModel,
    sections: [
      ...sampleInspectorModel.sections,
      {
        id: "report-graphs",
        title: "Report Graphs",
        charts: [
          {
            id: "classification-breakdown",
            title: "Classification Breakdown",
            kind: "bar",
            emptyState: "No data",
            points: [{ label: "fresh", value: 1 }],
          },
        ],
      },
    ],
  };

  const sections = getOrganizationReportTemplate("dti").buildSections(
    modelWithGraphs,
  );
  const graphSection = sections.find((s) => s.id === "report-graphs");

  assert.ok(graphSection, "report-graphs section must be present in dti inspector output");
  assert.equal(
    graphSection.title,
    "Operational Inspection Graphs",
    "dti inspector should rename report-graphs to 'Operational Inspection Graphs'",
  );
  assert.ok(graphSection.charts, "charts must be preserved");
});

// commit 12
test("city vet inspector template renames report-graphs to Veterinary Inspection Graphs", () => {
  const cityVetModel: ReportDocumentModel = {
    ...sampleInspectorModel,
    organization: "city_veterinary_office_olongapo",
    templateKey: "city_vet",
    sections: [
      ...sampleInspectorModel.sections,
      {
        id: "report-graphs",
        title: "Report Graphs",
        charts: [
          {
            id: "meat-type-breakdown",
            title: "Meat Type Breakdown",
            kind: "bar",
            emptyState: "No data",
            points: [{ label: "pork", value: 2 }],
          },
        ],
      },
    ],
  };

  const sections = getOrganizationReportTemplate("city_vet").buildSections(
    cityVetModel,
  );
  const graphSection = sections.find((s) => s.id === "report-graphs");

  assert.ok(graphSection, "report-graphs section must be present in city_vet inspector output");
  assert.equal(
    graphSection.title,
    "Veterinary Inspection Graphs",
    "city_vet inspector should rename report-graphs to 'Veterinary Inspection Graphs'",
  );
  assert.ok(graphSection.charts, "charts must be preserved");
});

// commit 13
test("gcccs inspector template renames report-graphs to Technical Inspection Graphs", () => {
  const gcccsModel: ReportDocumentModel = {
    ...sampleInspectorModel,
    organization: "gordon_college_ccs",
    templateKey: "gcccs",
    sections: [
      ...sampleInspectorModel.sections,
      {
        id: "report-graphs",
        title: "Report Graphs",
        charts: [
          {
            id: "confidence-by-hour",
            title: "Confidence by Hour",
            kind: "line",
            emptyState: "No data",
            points: [{ label: "08:00", value: 80 }],
          },
        ],
      },
    ],
  };

  const sections = getOrganizationReportTemplate("gcccs").buildSections(
    gcccsModel,
  );
  const graphSection = sections.find((s) => s.id === "report-graphs");

  assert.ok(graphSection, "report-graphs section must be present in gcccs inspector output");
  assert.equal(
    graphSection.title,
    "Technical Inspection Graphs",
    "gcccs inspector should rename report-graphs to 'Technical Inspection Graphs'",
  );
  assert.ok(graphSection.charts, "charts must be preserved");
});

