import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminDashboardPageViewModel } from "../../hooks/useAdminDashboardPage";

type DesktopReportsTabContentProps = {
  dashboard: AdminDashboardPageViewModel;
};

const DesktopReportsTabContent = ({
  dashboard,
}: DesktopReportsTabContentProps) => {
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
    <div className="mt-6 grid min-w-0 gap-4 xl:grid-cols-[1fr_1fr]">
      <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle className="font-display text-sm uppercase tracking-wider">
            Generate Reports
          </CardTitle>
          <CardDescription className="text-xs">
            Build PDF summary, CSV detail, or JSON snapshot for a selected date
            range.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
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
          </div>

          {reportDateRangeInvalid ? (
            <p className="text-xs text-destructive">
              Start date must be on or before end date.
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {reportRows.length} inspection{reportRows.length !== 1 ? "s" : ""} in
            range
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2 rounded-xl"
              onClick={handleExportPDF}
            >
              <Download className="h-4 w-4" />
              PDF Summary
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2 rounded-xl"
              onClick={handleExportCSV}
            >
              <Download className="h-4 w-4" />
              CSV Detail
            </Button>
            <Button
              type="button"
              className="flex-1 gap-2 rounded-xl"
              onClick={handleExportJSON}
            >
              <Download className="h-4 w-4" />
              JSON Snapshot
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle className="font-display text-sm uppercase tracking-wider">
            Report Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reportRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No inspections found for the selected range. Adjust the date filter
              above.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DesktopReportsTabContent;
