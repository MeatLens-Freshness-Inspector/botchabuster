import assert from "node:assert/strict";
import test from "node:test";

import { getOrganizationReportTemplate } from "../../../../src/lib/reports/templates";

const baseAdminSections = [
  {
    id: "meat-summary",
    title: "Meat Inspection Summary",
    metrics: [{ label: "Average Confidence", value: "91%" }],
  },
  {
    id: "pork-gallery",
    title: "Pork Inspection Evidence",
    inspectionEvidence: [
      {
        id: "pork-1",
        imageUrl: "https://example.com/pork-1.jpg",
        capturedAt: "2026-08-03 10:00:00",
        meatType: "pork",
        classification: "fresh",
        confidenceLabel: "93%",
        location: "East Market",
        inspectorLabel: "Inspector One",
      },
    ],
    evidenceLayout: "photo-first" as const,
  },
  {
    id: "report-graphs",
    title: "Report Graphs",
    charts: [
      {
        id: "classification-breakdown",
        title: "Classification Breakdown",
        kind: "bar" as const,
        emptyState: "No data for selected range",
        points: [{ label: "fresh", value: 1 }],
      },
    ],
  },
  {
    id: "org-overview",
    title: "Organization Overview",
    metrics: [{ label: "Total Inspections", value: "3" }],
  },
  {
    id: "meat-detail",
    title: "Inspection Detail",
    tables: [
      {
        title: "Inspection Detail",
        columns: ["Created"],
        rows: [["2026-08-03 10:00:00"]],
      },
    ],
  },
];

test("dti admin template reorders sections and renames the organization-specific blocks", () => {
  const template = getOrganizationReportTemplate("dti");
  const sections = template.buildSections({
    organization: "dti",
    templateKey: "dti",
    kind: "admin_range",
    title: "Administrative Report",
    subtitle: "Range: 2026-08-01 to 2026-08-03",
    generatedAt: "Aug 3, 2026 10:40 AM",
    sections: baseAdminSections,
  });

  assert.deepEqual(
    sections.map((section) => section.id),
    ["org-overview", "report-graphs", "pork-gallery", "meat-summary", "meat-detail"],
  );
  assert.equal(sections[0].title, "Market Service and Operations Overview");
  assert.equal(sections[1].title, "Operational Inspection Graphs");
  assert.equal(sections[2].title, "Pork Meat Field Evidence");
});

test("city vet admin template reorders sections and keeps the pork gallery ahead of meat summaries", () => {
  const template = getOrganizationReportTemplate("city_vet");
  const sections = template.buildSections({
    organization: "city_veterinary_office_olongapo",
    templateKey: "city_vet",
    kind: "admin_range",
    title: "Administrative Report",
    subtitle: "Range: 2026-08-01 to 2026-08-03",
    generatedAt: "Aug 3, 2026 10:40 AM",
    sections: baseAdminSections,
  });

  assert.deepEqual(
    sections.map((section) => section.id),
    ["org-overview", "report-graphs", "pork-gallery", "meat-summary", "meat-detail"],
  );
  assert.equal(sections[0].title, "Veterinary and Meat Safety Overview");
  assert.equal(sections[1].title, "Veterinary Inspection Graphs");
  assert.equal(sections[2].title, "Pork Meat Veterinary Evidence");
});
