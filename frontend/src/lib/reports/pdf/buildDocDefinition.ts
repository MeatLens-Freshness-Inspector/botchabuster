import { getReportOrganizationLabel } from "@/lib/reportOrganizations";
import {
  loadReportBrandAsset,
} from "@/lib/reports/pdf/assets";
import { getReportPageFrame } from "@/lib/reports/pdf/pageFrames";
import { getOrganizationReportTemplate } from "@/lib/reports/templates";
import type {
  ReportDetailRow,
  ReportDocumentModel,
  ReportMetric,
  ReportSection,
  ReportTable,
} from "@/lib/reports/types";
import type {
  Content,
  ContentTable,
  DynamicContent,
  TDocumentDefinitions,
} from "pdfmake/interfaces";

interface BuildReportDocDefinitionDependencies {
  loadBrandAsset?: (path: string) => Promise<string>;
}

export async function buildReportDocDefinition(
  model: ReportDocumentModel,
  dependencies: BuildReportDocDefinitionDependencies = {},
): Promise<TDocumentDefinitions> {
  const template = getOrganizationReportTemplate(model.templateKey);
  const sections = template.buildSections(model);
  const frame = getReportPageFrame(model.templateKey);
  const loadBrandAsset =
    dependencies.loadBrandAsset ?? loadReportBrandAsset;
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
      margin: [0, 0, 46, 36],
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
    content: buildDocumentContent(model, sections, frame.sectionColor, frame),
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

function buildDocumentContent(
  model: ReportDocumentModel,
  sections: ReportSection[],
  sectionColor: string,
  frame: ReturnType<typeof getReportPageFrame>,
): Content[] {
  return [
    {
      text: model.title,
      style: "reportTitle",
      margin: [0, 0, 0, 4],
    },
    {
      text: model.subtitle,
      style: "reportSubtitle",
      margin: [0, 0, 0, 6],
    },
    {
      columns: [
        {
          text: `Generated: ${model.generatedAt}`,
          style: "reportMeta",
        },
        {
          text: `Organization: ${getReportOrganizationLabel(model.organization)}`,
          style: "reportMeta",
          alignment: "right",
        },
      ],
      margin: [0, 0, 0, 18],
    },
    ...sections.map((section) =>
      buildSectionBlock(section, sectionColor, frame),
    ),
  ];
}

function buildSectionBlock(
  section: ReportSection,
  sectionColor: string,
  frame: ReturnType<typeof getReportPageFrame>,
): Content {
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

function buildMetricGrid(metrics: ReportMetric[]): Content {
  const rows: Content[] = [];

  for (let index = 0; index < metrics.length; index += 2) {
    const metricPair = metrics.slice(index, index + 2);

    rows.push({
      columns: metricPair.map((metric, pairIndex) => ({
        width: "*",
        margin: pairIndex === 0 ? [0, 0, 8, 0] : [8, 0, 0, 0],
        stack: [
          {
            text: metric.label,
            style: "metricLabel",
            margin: [0, 0, 0, 2],
          },
          {
            text: metric.value,
            style: "metricValue",
          },
        ],
      })),
      margin: [0, 0, 0, 10],
    });
  }

  return {
    stack: rows,
    margin: [0, 0, 0, 6],
  };
}

function buildDetailRowTable(
  detailRows: ReportDetailRow[],
  frame: ReturnType<typeof getReportPageFrame>,
): ContentTable {
  return {
    table: {
      widths: ["30%", "*"],
      body: detailRows.map((detailRow) => [
        {
          text: detailRow.label,
          style: "detailLabel",
          fillColor: frame.tableHeaderFillColor,
        },
        {
          text: detailRow.value,
          style: "detailValue",
        },
      ]),
    },
    layout: {
      hLineColor: () => "#CBD5E1",
      vLineColor: () => "#CBD5E1",
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
    margin: [0, 0, 0, 10],
  };
}

function buildReportTable(
  table: ReportTable,
  frame: ReturnType<typeof getReportPageFrame>,
): Content {
  return {
    stack: [
      {
        text: table.title,
        style: "tableTitle",
        margin: [0, 0, 0, 6],
      },
      {
        table: {
          headerRows: 1,
          widths: table.columns.map(() => "*"),
          body: [
            table.columns.map((column) => ({
              text: column,
              style: "tableHeader",
              fillColor: frame.tableHeaderFillColor,
            })),
            ...table.rows.map((row) =>
              row.map((cell) => ({
                text: cell,
                style: "tableCell",
              })),
            ),
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
      },
    ],
    margin: [0, 0, 0, 10],
  };
}
