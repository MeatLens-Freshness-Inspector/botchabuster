import { useMemo, useState } from "react";
import { InspectionListItem } from "@/components/InspectionListItem";
import { InspectionDetailSheet } from "@/components/InspectionDetailSheet";
import { useInspections } from "@/hooks/useInspections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ClipboardList, Search, CalendarDays, BarChart3, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import type { FreshnessClassification } from "@/types/inspection";
import type { Inspection } from "@/types/inspection";
import { format, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";

type FilterOption = "all" | FreshnessClassification;

const filterOptions: { key: FilterOption; label: string }[] = [
  { key: "all", label: "All" },
  { key: "fresh", label: "Fresh" },
  { key: "not fresh", label: "Not Fresh" },
  { key: "acceptable", label: "Acceptable" },
  { key: "warning", label: "Warning" },
  { key: "spoiled", label: "Spoiled" },
];

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const HistoryPage = () => {
  const { data: inspections, isLoading } = useInspections();
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReportDay, setSelectedReportDay] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const PAGE_SIZE = 6;

  const totalInspections = inspections?.length ?? 0;
  const reportDayDate = useMemo(() => new Date(`${selectedReportDay}T00:00:00`), [selectedReportDay]);
  const hasValidReportDay = !Number.isNaN(reportDayDate.getTime());

  const selectedDayRange = useMemo(() => {
    if (!hasValidReportDay) return null;
    return {
      start: startOfDay(reportDayDate),
      end: endOfDay(reportDayDate),
    };
  }, [hasValidReportDay, reportDayDate]);

  const avgConfidence = useMemo(() => {
    if (!inspections?.length) return 0;
    return Math.round(inspections.reduce((sum, item) => sum + item.confidence_score, 0) / inspections.length);
  }, [inspections]);

  const classificationCounts = useMemo(() => {
    const counts: Record<FreshnessClassification, number> = {
      fresh: 0,
      "not fresh": 0,
      acceptable: 0,
      warning: 0,
      spoiled: 0,
    };
    (inspections ?? []).forEach((item) => {
      counts[item.classification] += 1;
    });
    return counts;
  }, [inspections]);

  const freshRate = useMemo(() => {
    if (!totalInspections) return 0;
    return Math.round((classificationCounts.fresh / totalInspections) * 100);
  }, [classificationCounts.fresh, totalInspections]);

  const spoiledRate = useMemo(() => {
    if (!totalInspections) return 0;
    return Math.round((classificationCounts.spoiled / totalInspections) * 100);
  }, [classificationCounts.spoiled, totalInspections]);

  const filteredInspections = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return (inspections ?? []).filter((item) => {
      if (selectedDayRange) {
        const createdAt = new Date(item.created_at);
        if (createdAt < selectedDayRange.start || createdAt > selectedDayRange.end) return false;
      }

      const matchesFilter = activeFilter === "all" || item.classification === activeFilter;
      if (!matchesFilter) return false;
      if (!query) return true;

      const haystack = [
        item.meat_type,
        item.location ?? "",
        item.classification,
        item.id,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [inspections, activeFilter, searchText, selectedDayRange]);

  const selectedDayInspections = useMemo(() => {
    if (!selectedDayRange) return [];
    return (inspections ?? []).filter((inspection) => {
      const createdAt = new Date(inspection.created_at);
      return createdAt >= selectedDayRange.start && createdAt <= selectedDayRange.end;
    });
  }, [inspections, selectedDayRange]);

  const totalPages = Math.max(1, Math.ceil(filteredInspections.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedInspections = filteredInspections.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const monthlyCounts = useMemo(() => {
    const monthMap = new Map<string, number>();
    (inspections ?? []).forEach((item) => {
      const monthKey = format(new Date(item.created_at), "MMMM yyyy");
      monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + 1);
    });
    return Array.from(monthMap.entries()).map(([label, count]) => ({ label, count })).slice(0, 6);
  }, [inspections]);

  const selectedDayAverageConfidence = useMemo(() => {
    if (selectedDayInspections.length === 0) return 0;
    return Math.round(
      selectedDayInspections.reduce((total, inspection) => total + inspection.confidence_score, 0) / selectedDayInspections.length
    );
  }, [selectedDayInspections]);

  const triggerDownload = (blob: Blob, fileName: string) => {
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
  };

  const validateDetailedDayExport = (): boolean => {
    if (!hasValidReportDay) {
      toast.error("Please choose a valid inspection day");
      return false;
    }

    if (selectedDayInspections.length === 0) {
      toast.error("No inspections found for the selected day");
      return false;
    }

    return true;
  };

  const getDetailedReportSuffix = () => selectedReportDay;

  const handleExportDetailedPDF = () => {
    if (!validateDetailedDayExport()) return;

    const generatedAt = format(new Date(), "MMM d, yyyy h:mm a");
    const inspectionCards = selectedDayInspections
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

    const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>MeatLens Inspector Report ${escapeHtml(selectedReportDay)}</title>
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
      h1 {
        margin: 0 0 4px 0;
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
      <h1>Inspector Daily Detailed Report</h1>
      <p class="meta">
        Inspection Day: ${escapeHtml(selectedReportDay)}<br />
        Generated: ${escapeHtml(generatedAt)}
      </p>
      <section class="summary">
        <div class="summary-item">
          <strong>Total Inspections</strong>
          <span>${selectedDayInspections.length}</span>
        </div>
        <div class="summary-item">
          <strong>Average Confidence</strong>
          <span>${selectedDayAverageConfidence}%</span>
        </div>
      </section>
      ${inspectionCards}
    </main>
  </body>
</html>`;

    const reportBlob = new Blob([html], { type: "text/html;charset=utf-8" });
    const reportUrl = URL.createObjectURL(reportBlob);
    const reportWindow = window.open(reportUrl, "_blank");

    if (!reportWindow) {
      URL.revokeObjectURL(reportUrl);
      triggerDownload(reportBlob, `MeatLens-inspector-detailed-${getDetailedReportSuffix()}.html`);
      toast.success("Report downloaded. Open it and choose Print to save as PDF.");
      return;
    }

    const cleanup = () => URL.revokeObjectURL(reportUrl);
    reportWindow.addEventListener("afterprint", cleanup, { once: true });
    reportWindow.addEventListener(
      "load",
      () => {
        reportWindow.focus();
        reportWindow.print();
      },
      { once: true },
    );
    window.setTimeout(cleanup, 60_000);

    toast.success("Detailed report opened. Save as PDF in the print dialog.");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] pb-24">
      <div className="mx-auto w-full max-w-6xl min-w-0 px-4 pt-4">
        <section className="rounded-3xl border border-border/70 bg-card/90 p-4 shadow-[0_24px_70px_-34px_rgba(0,0,0,0.65)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)]">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-xl font-semibold tracking-tight">History</h1>
                <p className="text-xs text-muted-foreground">Inspection records and timeline insights</p>
              </div>
            </div>

            <div className="rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
              <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
              {format(new Date(), "MMMM yyyy")}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)] p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Total Records</p>
              <p className="mt-1 font-display text-3xl font-semibold">{totalInspections}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-[hsl(var(--warning)/0.16)] p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Avg Confidence</p>
              <p className="mt-1 font-display text-3xl font-semibold">{avgConfidence}%</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Fresh Rate</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="font-display text-3xl font-semibold">{freshRate}%</p>
                <CheckCircle2 className="h-4 w-4 text-fresh" />
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Spoiled Rate</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="font-display text-3xl font-semibold">{spoiledRate}%</p>
                {spoiledRate > 20 ? <AlertTriangle className="h-4 w-4 text-spoiled" /> : <CheckCircle2 className="h-4 w-4 text-fresh" />}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="min-w-0 rounded-3xl border border-border/70 bg-card/92 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold">Inspection Timeline</h2>
              <span className="rounded-full border border-border/70 bg-background/55 px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                {filteredInspections.length} shown
              </span>
            </div>

            <div className="mt-3 rounded-2xl border border-border/70 bg-background/50 p-2">
              <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-2 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={searchText}
                  onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
                  placeholder="Search by meat type, location, ID..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>

              <div className="mt-2 grid gap-2 rounded-xl border border-border/70 bg-background/70 p-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
                <div className="space-y-1">
                  <label htmlFor="inspection-day" className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Inspection Day
                  </label>
                  <Input
                    id="inspection-day"
                    type="date"
                    value={selectedReportDay}
                    onChange={(event) => {
                      setSelectedReportDay(event.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-9 rounded-lg bg-background/80"
                  />
                </div>
                <Button type="button" size="sm" className="h-9 rounded-lg" onClick={handleExportDetailedPDF}>
                  Export PDF
                </Button>
              </div>

              <p className="mt-2 text-[11px] text-muted-foreground">
                {hasValidReportDay
                  ? `${selectedDayInspections.length} inspection${selectedDayInspections.length !== 1 ? "s" : ""} found for ${format(reportDayDate, "MMMM d, yyyy")}`
                  : "Pick a valid date to generate detailed day reports"}
              </p>

              <div className="mt-2 grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 sm:grid-cols-5">
                {filterOptions.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => { setActiveFilter(option.key); setCurrentPage(1); }}
                    className={`rounded-xl border px-2 py-2 text-[11px] uppercase tracking-widest transition-colors ${
                      activeFilter === option.key
                        ? "border-primary/40 bg-[hsl(var(--primary)/0.16)] text-foreground"
                        : "border-border/60 bg-background/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !filteredInspections.length ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-background/55 py-16 text-muted-foreground">
                  <ClipboardList className="mb-3 h-12 w-12" />
                  <p className="font-display text-sm uppercase tracking-wider">No matching inspections</p>
                  <p className="mt-1 text-xs">Try a different filter or search term</p>
                </div>
              ) : (
                <>
                  {pagedInspections.map((inspection) => (
                    <InspectionListItem
                      key={inspection.id}
                      inspection={inspection}
                      onSelect={setSelectedInspection}
                    />
                  ))}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 rounded-xl"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" /> Prev
                      </Button>
                      <span className="font-display text-xs text-muted-foreground uppercase tracking-wider">
                        {safePage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 rounded-xl"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                      >
                        Next <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <section className="min-w-0 space-y-4">
            <Card className="rounded-3xl border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle className="text-sm font-display uppercase tracking-wider">Selected Day Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-background/55 p-3">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Day Inspections</p>
                  <p className="mt-1 font-display text-2xl font-semibold">{selectedDayInspections.length}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/55 p-3">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Day Avg Confidence</p>
                  <p className="mt-1 font-display text-2xl font-semibold">{selectedDayAverageConfidence}%</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-display uppercase tracking-wider">
                  <BarChart3 className="h-4 w-4" />
                  Classification Mix
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(["fresh", "not fresh", "acceptable", "warning", "spoiled"] as FreshnessClassification[]).map((c) => {
                  const count = classificationCounts[c] || 0;
                  const pct = totalInspections > 0 ? (count / totalInspections) * 100 : 0;
                  return (
                    <div key={c}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-display text-xs uppercase tracking-wider">{c}</span>
                        <span className="font-display text-xs text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full transition-all ${
                            c === "fresh"
                              ? "bg-fresh"
                              : c === "not fresh"
                                ? "bg-warning"
                              : c === "acceptable"
                                ? "bg-acceptable"
                                : c === "warning"
                                  ? "bg-warning"
                                  : "bg-spoiled"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle className="text-sm font-display uppercase tracking-wider">Recent Activity by Month</CardTitle>
              </CardHeader>
              <CardContent>
                {!monthlyCounts.length ? (
                  <p className="py-4 text-sm text-muted-foreground">No activity yet</p>
                ) : (
                  <div className="space-y-2">
                    {monthlyCounts.map((month) => (
                      <div key={month.label} className="flex items-center justify-between rounded-xl border border-border/70 bg-background/55 px-3 py-2.5">
                        <span className="text-xs text-muted-foreground">{month.label}</span>
                        <span className="font-display text-sm font-semibold">{month.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      <InspectionDetailSheet
        inspection={selectedInspection}
        open={selectedInspection !== null}
        onOpenChange={(open) => { if (!open) setSelectedInspection(null); }}
      />
    </div>
  );
};

export default HistoryPage;
