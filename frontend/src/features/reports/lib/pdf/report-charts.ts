import type { ReportChart } from "@/features/reports/model/types";
import type { ReportPageFrame } from "@/features/reports/lib/page-frames";
import type { Content } from "pdfmake/interfaces";

const CHART_WIDTH = 460;
const CHART_HEIGHT = 210;
const CHART_MARGIN = {
  top: 16,
  right: 16,
  bottom: 68,
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
  const allPoints = chart.series?.flatMap((series) => series.points) ?? chart.points;
  if (
    allPoints.length === 0 ||
    allPoints.every((point) => point.value <= 0)
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
  if (chart.orientation === "horizontal") {
    return buildHorizontalBarChartSvg(chart, frame);
  }

  const chartSeries = chart.series && chart.series.length > 0
    ? chart.series
    : [{ name: "Value", points: chart.points, color: undefined }];
  const maxValue = Math.max(...chartSeries.flatMap((series) => series.points.map((point) => point.value)), 1);
  const plotWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const plotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const pointCount = Math.max(...chartSeries.map((series) => series.points.length), 0);
  const barSlotWidth = pointCount > 0 ? plotWidth / pointCount : plotWidth;
  const groupWidth = Math.min(64, barSlotWidth * 0.78);
  const barWidth = Math.max(4, groupWidth / chartSeries.length - 3);
  const shouldRotate = chart.rotateLabels ?? (pointCount > 4 || chart.id === "location-breakdown");

  const bars = Array.from({ length: pointCount }, (_, index) => {
    const label = chartSeries.find((series) => series.points[index])?.points[index]?.label ?? "";
    const labelX = round(CHART_MARGIN.left + index * barSlotWidth + barSlotWidth / 2);
    const labelY = round(shouldRotate ? CHART_MARGIN.top + plotHeight + 10 : CHART_MARGIN.top + plotHeight + 16);
    const labelText = shouldRotate
      ? `<text x="${labelX}" y="${labelY}" font-size="8.5" text-anchor="end" transform="rotate(-30 ${labelX} ${labelY})" fill="${frame.bodyColor}">${escapeXml(truncateLabel(label))}</text>`
      : `<text x="${labelX}" y="${labelY}" font-size="9" text-anchor="middle" fill="${frame.bodyColor}">${escapeXml(truncateLabel(label))}</text>`;
    const seriesBars = chartSeries.map((series, seriesIndex) => {
      const point = series.points[index];
      if (!point) return "";
      const barHeight = (point.value / maxValue) * plotHeight;
      const x = CHART_MARGIN.left + index * barSlotWidth + (barSlotWidth - groupWidth) / 2 + seriesIndex * (barWidth + 3);
      const y = CHART_MARGIN.top + plotHeight - barHeight;
      const fill = point.color ?? series.color ?? frame.sectionColor;
      return [
        `<rect x="${round(x)}" y="${round(y)}" width="${round(barWidth)}" height="${round(barHeight)}" rx="3" fill="${fill}" />`,
        `<text x="${round(x + barWidth / 2)}" y="${round(y - 6)}" font-size="8" text-anchor="middle" fill="${frame.bodyColor}">${escapeXml(String(point.value))}</text>`,
      ].join("");
    }).join("");
    return `${seriesBars}${labelText}`;
  }).join("");

  return wrapSvg(
    [
      buildChartGrid(frame.bodyColor),
      buildAxis(frame.bodyColor),
      bars,
    ].join(""),
  );
}

function buildHorizontalBarChartSvg(
  chart: ReportChart,
  frame: Pick<ReportPageFrame, "sectionColor" | "bodyColor">,
): string {
  const chartSeries = chart.series && chart.series.length > 0
    ? chart.series
    : [{ name: "Value", points: chart.points, color: undefined }];
  const allPoints = chartSeries.flatMap((series) => series.points);
  const pointLabels = Array.from(new Set(allPoints.map((point) => point.label)));
  const maxValue = Math.max(...allPoints.map((point) => point.value), 1);
  const plotWidth = CHART_WIDTH - 130 - CHART_MARGIN.right;
  const plotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const groupSlotHeight = pointLabels.length > 0 ? plotHeight / pointLabels.length : plotHeight;
  const groupHeight = Math.min(32, groupSlotHeight * 0.78);
  const barHeight = Math.max(4, groupHeight / chartSeries.length - 2);
  const plotLeft = 130;

  const legend = chartSeries.map((series, index) => {
    const x = 8 + index * 90;
    const color = series.color ?? frame.sectionColor;
    return `<rect x="${round(x)}" y="2" width="8" height="8" rx="2" fill="${color}" /><text x="${round(x + 12)}" y="10" font-size="8" fill="${frame.bodyColor}">${escapeXml(series.name)}</text>`;
  }).join("");

  const bars = pointLabels.map((label, pointIndex) => {
    const groupTop = CHART_MARGIN.top + pointIndex * groupSlotHeight + (groupSlotHeight - groupHeight) / 2;
    const labelY = groupTop + groupHeight / 2 + 3;
    const labelText = `<text x="${plotLeft - 8}" y="${round(labelY)}" font-size="8.5" text-anchor="end" fill="${frame.bodyColor}">${escapeXml(truncateLabel(label))}</text>`;
    const seriesBars = chartSeries.map((series, seriesIndex) => {
      const point = series.points.find((candidate) => candidate.label === label);
      if (!point) return "";
      const barWidth = (point.value / maxValue) * plotWidth;
      const y = groupTop + seriesIndex * (barHeight + 2);
      const fill = point.color ?? series.color ?? frame.sectionColor;
      return [
        `<rect x="${plotLeft}" y="${round(y)}" width="${round(barWidth)}" height="${round(barHeight)}" rx="3" fill="${fill}" />`,
        `<text x="${round(plotLeft + barWidth + 4)}" y="${round(y + barHeight - 1)}" font-size="8" fill="${frame.bodyColor}">${escapeXml(String(point.value))}</text>`,
      ].join("");
    }).join("");
    return `${labelText}${seriesBars}`;
  }).join("");

  return wrapSvg(
    [
      legend,
      buildChartGrid(frame.bodyColor, plotLeft, plotWidth),
      buildHorizontalAxis(frame.bodyColor, plotLeft, plotWidth),
      bars,
    ].join(""),
  );
}

function buildLineChartSvg(
  chart: ReportChart,
  frame: Pick<ReportPageFrame, "sectionColor" | "bodyColor">,
): string {
  const chartSeries = chart.series && chart.series.length > 0
    ? chart.series
    : [{ name: "Value", points: chart.points, color: undefined }];
  const labels = Array.from(new Set(chartSeries.flatMap((series) => series.points.map((point) => point.label))));
  const maxValue = Math.max(...chartSeries.flatMap((series) => series.points.map((point) => point.value)), 1);
  const plotWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const plotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const stepX = labels.length > 1 ? plotWidth / (labels.length - 1) : 0;
  const colors = chartSeries.map((series) => series.color ?? frame.sectionColor);
  const legend = chartSeries.map((series, index) => {
    const x = 8 + index * 112;
    return `<rect x="${round(x)}" y="2" width="8" height="8" rx="2" fill="${colors[index]}" /><text x="${round(x + 12)}" y="10" font-size="8" fill="${frame.bodyColor}">${escapeXml(series.name)}</text>`;
  }).join("");

  const seriesContent = chartSeries.map((series, seriesIndex) => {
    const plottedPoints = series.points.map((point) => {
      const index = labels.indexOf(point.label);
      const x = CHART_MARGIN.left + stepX * index;
      const y = CHART_MARGIN.top + plotHeight - (point.value / maxValue) * plotHeight;
      return { ...point, x, y };
    });
    const polyline = plottedPoints.length > 0
      ? `<polyline fill="none" stroke="${colors[seriesIndex]}" stroke-width="3" points="${plottedPoints.map((point) => `${round(point.x)},${round(point.y)}`).join(" ")}" />`
      : "";
    const pointMarkers = plottedPoints.map((point) => [
      `<circle cx="${round(point.x)}" cy="${round(point.y)}" r="4" fill="${colors[seriesIndex]}" />`,
      `<text x="${round(point.x)}" y="${round(point.y - 10)}" font-size="10" text-anchor="middle" fill="${frame.bodyColor}">${escapeXml(String(point.value))}</text>`,
    ].join("")).join("");
    return `${polyline}${pointMarkers}`;
  }).join("");

  const labelsContent = labels.map((label, index) => {
    const x = round(CHART_MARGIN.left + stepX * index);
    const y = round(CHART_MARGIN.top + plotHeight + 10);
    return `<text x="${x}" y="${y}" font-size="8.5" text-anchor="end" transform="rotate(-90 ${x} ${y})" fill="${frame.bodyColor}">${escapeXml(truncateLabel(label))}</text>`;
  }).join("");

  return wrapSvg(
    [
      legend,
      buildChartGrid(frame.bodyColor),
      buildAxis(frame.bodyColor),
      seriesContent,
      labelsContent,
    ].join(""),
  );
}

function buildChartGrid(
  bodyColor: string,
  plotLeft = CHART_MARGIN.left,
  plotWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right,
): string {
  const plotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const gridColor = `${bodyColor}22`;

  return Array.from({ length: 4 }, (_, index) => {
    const y = CHART_MARGIN.top + (plotHeight / 3) * index;

    return `<line x1="${round(plotLeft)}" y1="${round(y)}" x2="${round(plotLeft + plotWidth)}" y2="${round(y)}" stroke="${gridColor}" stroke-width="1" />`;
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

function buildHorizontalAxis(bodyColor: string, plotLeft: number, plotWidth: number): string {
  const plotBottom = CHART_MARGIN.top + (CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom);
  return `<line x1="${plotLeft}" y1="${CHART_MARGIN.top}" x2="${plotLeft}" y2="${plotBottom}" stroke="${bodyColor}" stroke-width="1.5" /><line x1="${plotLeft}" y1="${plotBottom}" x2="${plotLeft + plotWidth}" y2="${plotBottom}" stroke="${bodyColor}" stroke-width="1.5" />`;
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
