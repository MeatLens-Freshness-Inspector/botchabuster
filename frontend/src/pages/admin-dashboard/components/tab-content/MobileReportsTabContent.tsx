import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminDashboardPageViewModel } from "../../hooks/useAdminDashboardPage";

type MobileReportsTabContentProps = {
  dashboard: AdminDashboardPageViewModel;
};

const MobileReportsTabContent = ({
  dashboard,
}: MobileReportsTabContentProps) => {
  const {
    reportStartDate,
    reportEndDate,
    reportDateRangeInvalid,
    reportRows,
    reportSummary,
    reportClassCounts,
    setReportStartDate,
    setReportEndDate,
    handleExportPDF,
    handleExportCSV,
    handleExportJSON,
  } = dashboard;

  return (
    <section className="mt-4 rounded-3xl border border-border/70 bg-card/90 p-4">
      <h2 className="font-display text-xl font-semibold uppercase tracking-wider">
        Generate Reports
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Build PDF summary, CSV detail, or JSON snapshot for a selected date range.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="space-y-1">
          <Label
            htmlFor="report-start-date"
            className="text-[11px] uppercase tracking-widest text-muted-foreground"
          >
            Start Date
          </Label>
          <Input
            id="report-start-date"
            type="date"
            value={reportStartDate}
            onChange={(event) => setReportStartDate(event.target.value)}
            className="h-10 rounded-xl"
          />
        </div>
        <div className="space-y-1">
          <Label
            htmlFor="report-end-date"
            className="text-[11px] uppercase tracking-widest text-muted-foreground"
          >
            End Date
          </Label>
          <Input
            id="report-end-date"
            type="date"
            value={reportEndDate}
            onChange={(event) => setReportEndDate(event.target.value)}
            className="h-10 rounded-xl"
          />
        </div>
        <div className="flex flex-col gap-2 self-end sm:flex-row lg:justify-end">
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={handleExportPDF}
          >
            <Download className="h-4 w-4" />
            PDF Summary
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={handleExportCSV}
          >
            <Download className="h-4 w-4" />
            CSV Detail
          </Button>
          <Button
            type="button"
            className="gap-2 rounded-xl"
            onClick={handleExportJSON}
          >
            <Download className="h-4 w-4" />
            JSON Snapshot
          </Button>
        </div>
      </div>

      {reportDateRangeInvalid ? (
        <p className="mt-2 text-xs text-destructive">
          Start date must be on or before end date.
        </p>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground">
        {reportRows.length} inspection{reportRows.length !== 1 ? "s" : ""} in range
      </p>

      {reportRows.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-border/70 bg-background/50 p-4">
          <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider">
            Report Preview
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-[hsl(var(--primary)/0.14)] p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Total Inspections
              </p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {reportSummary.total}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/65 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Avg Confidence
              </p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {reportSummary.averageConfidence}%
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/65 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Spoiled Rate
              </p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {reportSummary.spoiledRate}%
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-[hsl(var(--warning)/0.16)] p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Fresh
              </p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {reportClassCounts.fresh}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default MobileReportsTabContent;
