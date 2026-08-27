import { getReportOrganizationLabel } from "../../model/organizations";
import { buildReportChartContent } from "./report-charts";
import type { Content, ContentTable } from "pdfmake/interfaces";
import type {
  ReportDetailRow,
  ReportDocumentModel,
  ReportInspectionEvidenceItem,
  ReportMetric,
  ReportSection,
  ReportTable,
} from "../../model/types";
import { getReportPageFrame, type ReportPageFrame } from "../page-frames";

type InspectionImageLoader = (path: string | null | undefined) => Promise<string | null>;

export async function buildReportDocumentSections(
  model: ReportDocumentModel,
  sections: ReportSection[],
  sectionColor: string,
  frame: ReportPageFrame,
  loadInspectionImageAsset: InspectionImageLoader,
): Promise<Content[]> {
  return [
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
    ...(await Promise.all(sections.map((section) =>
      buildSectionBlock(section, sectionColor, frame, loadInspectionImageAsset)
    ))),
  ];
}

async function buildSectionBlock(
  section: ReportSection,
  sectionColor: string,
  frame: ReportPageFrame,
  loadInspectionImageAsset: InspectionImageLoader,
): Promise<Content> {
  const sectionContent: Content[] = [
    { text: section.title, style: "sectionTitle", margin: [0, 0, 0, 8] },
  ];
  for (const paragraph of section.narrative ?? []) {
    sectionContent.push({ text: paragraph, style: "narrative", margin: [0, 0, 0, 8] });
  }
  if ((section.metrics?.length ?? 0) > 0) sectionContent.push(buildMetricGrid(section.metrics ?? []));
  if ((section.detailRows?.length ?? 0) > 0) sectionContent.push(buildDetailRowTable(section.detailRows ?? [], frame));
  for (const chart of section.charts ?? []) sectionContent.push(buildReportChartContent(chart, frame));
  if (section.evidenceLayout === "photo-first" && (section.inspectionEvidence?.length ?? 0) > 0) {
    sectionContent.push(...await buildInspectionEvidenceContent(section.inspectionEvidence ?? [], frame, loadInspectionImageAsset));
  }
  for (const table of section.tables ?? []) sectionContent.push(buildReportTable(table, frame));
  return { stack: sectionContent, margin: [0, 0, 0, 18], unbreakable: false, fillColor: "#FFFFFF", color: sectionColor };
}

async function buildInspectionEvidenceContent(
  inspectionEvidence: ReportInspectionEvidenceItem[],
  frame: ReportPageFrame,
  loadInspectionImageAsset: InspectionImageLoader,
): Promise<Content[]> {
  return Promise.all(inspectionEvidence.map(async (evidenceItem) => {
    const imageState = await resolveInspectionImageState(evidenceItem.imageUrl, loadInspectionImageAsset);
    return {
      stack: [{
        columns: [
          {
            width: 220,
            margin: [0, 0, 14, 0],
            stack: imageState.kind === "loaded"
              ? [{ image: imageState.dataUrl, fit: [220, 170], alignment: "center", margin: [0, 0, 0, 6] }]
              : buildInspectionImagePlaceholder(imageState.kind),
          },
          {
            width: "*",
            stack: [
              ...(evidenceItem.inspectorLabel ? [buildInspectionEvidenceField("Inspector", evidenceItem.inspectorLabel)] : []),
              buildInspectionEvidenceField("Captured", evidenceItem.capturedAt),
              buildInspectionEvidenceField("Meat", evidenceItem.meatType),
              buildInspectionEvidenceField("Classification", evidenceItem.classification),
              buildInspectionEvidenceField("Confidence", evidenceItem.confidenceLabel),
              ...(evidenceItem.regulatoryCompliance !== undefined
                ? [buildInspectionEvidenceField("Regulatory Compliance", evidenceItem.regulatoryCompliance)]
                : []),
              ...(evidenceItem.regulatoryComplianceReason !== undefined
                ? [buildInspectionEvidenceField("Reason", evidenceItem.regulatoryComplianceReason)]
                : []),
              buildInspectionEvidenceField("Location", evidenceItem.location),
            ],
          },
        ],
        columnGap: 12,
      }],
      margin: [0, 0, 0, 12],
      unbreakable: true,
    } satisfies Content;
  }));
}

async function resolveInspectionImageState(
  path: string | null | undefined,
  loadInspectionImageAsset: InspectionImageLoader,
): Promise<{ kind: "loaded"; dataUrl: string } | { kind: "missing" }> {
  if (!path) return { kind: "missing" };
  const asset = await loadInspectionImageAsset(path);
  if (!asset) {
    throw new Error(`Failed to load inspection image "${path}"`);
  }
  return { kind: "loaded", dataUrl: asset };
}

function buildInspectionEvidenceField(label: string, value: string): Content {
  return {
    stack: [
      { text: label, style: "detailLabel", margin: [0, 0, 0, 2] },
      { text: value, style: "detailValue", margin: [0, 0, 0, 8] },
    ],
  };
}

function buildInspectionImagePlaceholder(kind: "missing"): Content[] {
  const title = "No image captured";
  const body = "This inspection record has no raw capture attached.";
  return [
    {
      canvas: [{ type: "rect" as const, x: 0, y: 0, w: 220, h: 130, r: 4, lineColor: "#CBD5E1", color: "#F8FAFC" }],
      margin: [0, 0, 0, 0],
    },
    { text: title, style: "evidencePlaceholderTitle", alignment: "center", margin: [0, -78, 0, 4] },
    { text: body, style: "evidencePlaceholderBody", alignment: "center", margin: [20, 0, 20, 38] },
  ];
}

function buildMetricGrid(metrics: ReportMetric[]): Content {
  const rows: Content[] = [];
  for (let index = 0; index < metrics.length; index += 2) {
    const metricPair = metrics.slice(index, index + 2);
    rows.push({
      columns: metricPair.map((metric, pairIndex) => ({
        width: "*",
        margin: pairIndex === 0 ? [0, 0, 8, 0] : [8, 0, 0, 0],
        stack: [
          { text: metric.label, style: "metricLabel", margin: [0, 0, 0, 2] },
          { text: metric.value, style: "metricValue" },
        ],
      })),
      margin: [0, 0, 0, 10],
    });
  }
  return { stack: rows, margin: [0, 0, 0, 6] };
}

function buildDetailRowTable(detailRows: ReportDetailRow[], frame: ReportPageFrame): ContentTable {
  return {
    table: {
      widths: ["30%", "*"],
      body: detailRows.map((detailRow) => [
        { text: detailRow.label, style: "detailLabel", fillColor: frame.tableHeaderFillColor },
        { text: detailRow.value, style: "detailValue" },
      ]),
    },
    layout: { hLineColor: () => "#CBD5E1", vLineColor: () => "#CBD5E1", paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 6, paddingBottom: () => 6 },
    margin: [0, 0, 0, 10],
  };
}

function buildReportTable(table: ReportTable, frame: ReportPageFrame): Content {
  return {
    stack: [
      { text: table.title, style: "tableTitle", margin: [0, 0, 0, 6] },
      {
        table: {
          headerRows: 1,
          widths: table.columns.map(() => "*"),
          body: [
            table.columns.map((column) => ({ text: column, style: "tableHeader", fillColor: frame.tableHeaderFillColor })),
            ...table.rows.map((row) => row.map((cell) => ({ text: cell, style: "tableCell" }))),
          ],
        },
        layout: { hLineColor: () => "#CBD5E1", vLineColor: () => "#CBD5E1", paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 6, paddingBottom: () => 6 },
      },
    ],
    margin: [0, 0, 0, 10],
  };
}
