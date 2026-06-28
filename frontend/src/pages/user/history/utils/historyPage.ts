import { format } from "date-fns";
import { getReportOrganizationLabel } from "@/lib/reportOrganizations";
import type {
  FreshnessClassification,
  Inspection,
} from "@/types/inspection";
import type {
  DetailedHistoryReportInput,
  HistoryFilterOption,
} from "../types";

export const HISTORY_FILTER_OPTIONS: HistoryFilterOption[] = [
  { key: "all", label: "All" },
  { key: "fresh", label: "Fresh" },
  { key: "not fresh", label: "Not Fresh" },
  { key: "acceptable", label: "Acceptable" },
  { key: "warning", label: "Warning" },
  { key: "spoiled", label: "Spoiled" },
];

export const HISTORY_CLASSIFICATIONS: FreshnessClassification[] = [
  "fresh",
  "not fresh",
  "acceptable",
  "warning",
  "spoiled",
];

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  }, 1000);
}

export function buildDetailedHistoryReportHtml({
  averageConfidence,
  generatedAt,
  inspections,
  selectedReportDay,
  reportOrganization,
}: DetailedHistoryReportInput): string {
  const organizationLabel = getReportOrganizationLabel(reportOrganization);
  const inspectionCards = inspections
    .map((inspection, index) => {
      const imageSection = inspection.image_url
        ? `<div class="image-wrap"><img src="${escapeHtml(inspection.image_url)}" alt="Inspection image ${index + 1}" /></div>`
        : '<div class="no-image">No inspection image saved</div>';

      return `
        <article class="inspection-card">
          <header>
            <h3>Inspection ${index + 1}</h3>
            <span class="id-chip">${escapeHtml(inspection.id)}</span>
          </header>
          ${imageSection}
          <div class="detail-grid">
            <p><strong>Captured:</strong> ${escapeHtml(format(new Date(inspection.created_at), "yyyy-MM-dd h:mm a"))}</p>
            <p><strong>Meat Type:</strong> ${escapeHtml(inspection.meat_type)}</p>
            <p><strong>Classification:</strong> ${escapeHtml(inspection.classification)}</p>
            <p><strong>Confidence:</strong> ${inspection.confidence_score}%</p>
            <p><strong>Location:</strong> ${escapeHtml(inspection.location ?? "-")}</p>
            <p><strong>Notes:</strong> ${escapeHtml(inspection.inspector_notes ?? "-")}</p>
            <p class="full"><strong>Flagged Deviations:</strong> ${escapeHtml(inspection.flagged_deviations.join(", ") || "-")}</p>
            <p class="full"><strong>Explanation:</strong> ${escapeHtml(inspection.explanation ?? "-")}</p>
          </div>
        </article>
      `;
    })
    .join("");

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(organizationLabel)} Report ${escapeHtml(selectedReportDay)}</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        padding: 20px;
        font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        background: #f5f7fb;
        color: #0f172a;
      }
      .sheet {
        max-width: 920px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #dbe3ef;
        border-radius: 14px;
        padding: 20px;
      }
      .org-heading {
        margin: 0;
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: #0f766e;
      }
      h1 {
        margin: 6px 0 4px 0;
        font-size: 24px;
      }
      .meta {
        color: #475569;
        margin: 0 0 16px 0;
        font-size: 13px;
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 14px;
      }
      .summary-item {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 10px;
      }
      .summary-item strong {
        display: block;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #64748b;
      }
      .summary-item span {
        display: block;
        margin-top: 4px;
        font-size: 18px;
        font-weight: 700;
      }
      .inspection-card {
        border: 1px solid #dbe3ef;
        border-radius: 12px;
        padding: 12px;
        margin-top: 12px;
        break-inside: avoid;
      }
      .inspection-card header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }
      .inspection-card h3 {
        margin: 0;
        font-size: 16px;
      }
      .id-chip {
        font-size: 11px;
        color: #475569;
        border: 1px solid #cbd5e1;
        border-radius: 999px;
        padding: 4px 8px;
      }
      .image-wrap {
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        overflow: hidden;
        background: #0f172a;
        margin-bottom: 10px;
      }
      .image-wrap img {
        width: 100%;
        max-height: 300px;
        object-fit: contain;
        display: block;
      }
      .no-image {
        border: 1px dashed #cbd5e1;
        border-radius: 10px;
        padding: 14px;
        color: #64748b;
        font-size: 13px;
        margin-bottom: 10px;
      }
      .detail-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px 14px;
        font-size: 13px;
      }
      .detail-grid p {
        margin: 0;
        line-height: 1.45;
      }
      .detail-grid p.full {
        grid-column: 1 / -1;
      }
      @media print {
        body { background: #fff; padding: 0; }
        .sheet { border: none; border-radius: 0; padding: 0; max-width: none; }
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <p class="org-heading">${escapeHtml(organizationLabel)}</p>
      <h1>Inspector Daily Detailed Report</h1>
      <p class="meta">
        Inspection Day: ${escapeHtml(selectedReportDay)}<br />
        Generated: ${escapeHtml(generatedAt)}
      </p>
      <section class="summary">
        <div class="summary-item">
          <strong>Total Inspections</strong>
          <span>${inspections.length}</span>
        </div>
        <div class="summary-item">
          <strong>Average Confidence</strong>
          <span>${averageConfidence}%</span>
        </div>
      </section>
      ${inspectionCards}
    </main>
  </body>
</html>`;
}

export function getHistoryClassificationColorClass(
  classification: FreshnessClassification,
): string {
  if (classification === "fresh") return "bg-fresh";
  if (classification === "not fresh") return "bg-warning";
  if (classification === "acceptable") return "bg-acceptable";
  if (classification === "warning") return "bg-warning";
  return "bg-spoiled";
}

export function buildHistorySearchText(inspection: Inspection): string {
  return [
    inspection.meat_type,
    inspection.location ?? "",
    inspection.classification,
    inspection.id,
  ]
    .join(" ")
    .toLowerCase();
}
