import type { ReportChart } from "@/lib/reports/types";
import type { ReportPageFrame } from "@/lib/reports/pdf/pageFrames";
import type { Content } from "pdfmake/interfaces";

const CHART_WIDTH = 460;
const CHART_HEIGHT = 170;
const CHART_MARGIN = {
  top: 16,
  right: 16,
  bottom: 40,
  left: 36,
} as const;

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
        ? ({
            svg,
            fit: [CHART_WIDTH, CHART_HEIGHT],
            margin: [0, 0, 0, 8],
          } as Content)
        : {
            text: chart.emptyState,
            style: "detailValue",
            margin: [0, 0, 0, 8],
          },
    ],
    margin: [0, 0, 0, 12],
  } satisfies Content;
}

export function buildReportChartSvg(
  chart: ReportChart,
  frame: Pick<ReportPageFrame, "sectionColor" | "bodyColor">,
): string | null {
  if (
    chart.points.length === 0 ||
    chart.points.every((point) => point.value <= 0)
  ) {
    return null;
  }

  return chart.kind === "line"
    ? buildLineChartSvg(chart, frame)
    : buildBarChartSvg(chart, frame);
}

function buildBarChartSvg(
  chart: ReportChart,
  frame: Pick<ReportPageFrame, "sectionColor" | "bodyColor">,
): string {
  const maxValue = Math.max(...chart.points.map((point) => point.value), 1);
  const plotWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const plotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const barSlotWidth = plotWidth / chart.points.length;
  const barWidth = Math.min(48, barSlotWidth * 0.62);

  const bars = chart.points
    .map((point, index) => {
      const barHeight = (point.value / maxValue) * plotHeight;
      const x = CHART_MARGIN.left + index * barSlotWidth + (barSlotWidth - barWidth) / 2;
      const y = CHART_MARGIN.top + plotHeight - barHeight;
      const fill = point.color ?? frame.sectionColor;

      return [
        `<rect x="${round(x)}" y="${round(y)}" width="${round(barWidth)}" height="${round(barHeight)}" rx="4" fill="${fill}" />`,
        `<text x="${round(x + barWidth / 2)}" y="${round(y - 6)}" font-size="10" text-anchor="middle" fill="${frame.bodyColor}">${escapeXml(String(point.value))}</text>`,
        `<text x="${round(x + barWidth / 2)}" y="${CHART_HEIGHT - 14}" font-size="9" text-anchor="middle" fill="${frame.bodyColor}">${escapeXml(truncateLabel(point.label))}</text>`,
      ].join("");
    })
    .join("");

  return wrapSvg(
    [
      buildChartGrid(frame.bodyColor),
      buildAxis(frame.bodyColor),
      bars,
    ].join(""),
  );
}

function buildLineChartSvg(
  chart: ReportChart,
  frame: Pick<ReportPageFrame, "sectionColor" | "bodyColor">,
): string {
  const maxValue = Math.max(...chart.points.map((point) => point.value), 1);
  const plotWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const plotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const stepX = chart.points.length > 1 ? plotWidth / (chart.points.length - 1) : 0;

  const plottedPoints = chart.points.map((point, index) => {
    const x = CHART_MARGIN.left + stepX * index;
    const y =
      CHART_MARGIN.top + plotHeight - (point.value / maxValue) * plotHeight;

    return { ...point, x, y };
  });

  const polyline = plottedPoints
    .map((point) => `${round(point.x)},${round(point.y)}`)
    .join(" ");

  const pointMarkers = plottedPoints
    .map((point) =>
      [
        `<circle cx="${round(point.x)}" cy="${round(point.y)}" r="4" fill="${frame.sectionColor}" />`,
        `<text x="${round(point.x)}" y="${round(point.y - 10)}" font-size="10" text-anchor="middle" fill="${frame.bodyColor}">${escapeXml(String(point.value))}</text>`,
        `<text x="${round(point.x)}" y="${CHART_HEIGHT - 14}" font-size="9" text-anchor="middle" fill="${frame.bodyColor}">${escapeXml(truncateLabel(point.label))}</text>`,
      ].join(""),
    )
    .join("");

  return wrapSvg(
    [
      buildChartGrid(frame.bodyColor),
      buildAxis(frame.bodyColor),
      `<polyline fill="none" stroke="${frame.sectionColor}" stroke-width="3" points="${polyline}" />`,
      pointMarkers,
    ].join(""),
  );
}

function buildChartGrid(bodyColor: string): string {
  const plotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const plotWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const gridColor = `${bodyColor}22`;

  return Array.from({ length: 4 }, (_, index) => {
    const y = CHART_MARGIN.top + (plotHeight / 3) * index;

    return `<line x1="${CHART_MARGIN.left}" y1="${round(y)}" x2="${CHART_MARGIN.left + plotWidth}" y2="${round(y)}" stroke="${gridColor}" stroke-width="1" />`;
  }).join("");
}

function buildAxis(bodyColor: string): string {
  const plotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const plotWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;

  return [
    `<line x1="${CHART_MARGIN.left}" y1="${CHART_MARGIN.top}" x2="${CHART_MARGIN.left}" y2="${CHART_MARGIN.top + plotHeight}" stroke="${bodyColor}" stroke-width="1.5" />`,
    `<line x1="${CHART_MARGIN.left}" y1="${CHART_MARGIN.top + plotHeight}" x2="${CHART_MARGIN.left + plotWidth}" y2="${CHART_MARGIN.top + plotHeight}" stroke="${bodyColor}" stroke-width="1.5" />`,
  ].join("");
}

function wrapSvg(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CHART_WIDTH}" height="${CHART_HEIGHT}" viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}"><rect x="0" y="0" width="${CHART_WIDTH}" height="${CHART_HEIGHT}" rx="8" fill="#FFFFFF" />${inner}</svg>`;
}

function truncateLabel(label: string): string {
  return label.length > 14 ? `${label.slice(0, 14)}…` : label;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function round(value: number): string {
  return value.toFixed(2);
}
