import type { TDocumentDefinitions, DynamicContent } from "pdfmake/interfaces";
import type { ReportPageFrame } from "../page-frames";

interface ReportHeaderModel {
  title: string;
  subtitle: string;
}

interface ReportHeaderTemplate {
  displayName: string;
}

export function buildReportDocumentHeader(
  model: ReportHeaderModel,
  template: ReportHeaderTemplate,
  frame: ReportPageFrame,
): Partial<TDocumentDefinitions> {
  const backgroundContent = (frame.backgroundMaskRectangles?.length ?? 0) > 0
    ? [
        {
          image: frame.backgroundAssetPath,
          width: 612,
          height: 792,
          absolutePosition: { x: 0, y: 0 },
        },
        ...frame.backgroundMaskRectangles!.map((rectangle) => ({
          canvas: [{
            type: "rect" as const,
            x: rectangle.x,
            y: rectangle.y,
            w: rectangle.w,
            h: rectangle.h,
            color: rectangle.color,
          }],
        })),
      ]
    : {
        image: frame.backgroundAssetPath,
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
    styles: {
      reportTitle: { fontSize: 20, bold: true, color: frame.sectionColor },
      reportSubtitle: { fontSize: 11, color: frame.bodyColor },
      reportMeta: { fontSize: 9, color: frame.bodyColor },
      sectionTitle: { fontSize: 14, bold: true, color: frame.sectionColor },
      narrative: { fontSize: 10, lineHeight: 1.3, color: frame.bodyColor },
      metricLabel: { fontSize: 9, color: frame.bodyColor },
      metricValue: { fontSize: 15, bold: true, color: frame.sectionColor },
      detailLabel: { fontSize: 9, bold: true, color: frame.sectionColor },
      detailValue: { fontSize: 10, color: frame.bodyColor },
      tableTitle: { fontSize: 10, bold: true, color: frame.sectionColor },
      tableHeader: { fontSize: 9, bold: true, color: frame.tableHeaderTextColor },
      tableCell: { fontSize: 9, color: frame.bodyColor },
      evidencePlaceholderTitle: { fontSize: 10, bold: true, color: frame.sectionColor },
      evidencePlaceholderBody: { fontSize: 9, color: frame.bodyColor },
    },
  };
}
