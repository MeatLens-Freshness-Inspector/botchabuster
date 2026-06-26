import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InspectionListItem } from "@/components/InspectionListItem";
import { Loader2, ClipboardList, Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { Inspection } from "@/types/inspection";
import type { FilterOption } from "../types";
import { HISTORY_FILTER_OPTIONS } from "../utils/historyPage";

type InspectionTimelineSectionProps = {
  activeFilter: FilterOption;
  filteredCount: number;
  formattedReportDayLabel: string | null;
  hasValidReportDay: boolean;
  isLoading: boolean;
  pagedInspections: Inspection[];
  safePage: number;
  searchText: string;
  selectedDayCount: number;
  selectedReportDay: string;
  totalPages: number;
  onActiveFilterChange: (value: FilterOption) => void;
  onExportDetailedPdf: () => void;
  onInspectionSelect: (inspection: Inspection) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onReportDayChange: (value: string) => void;
  onSearchTextChange: (value: string) => void;
};

export function InspectionTimelineSection({
  activeFilter,
  filteredCount,
  formattedReportDayLabel,
  hasValidReportDay,
  isLoading,
  pagedInspections,
  safePage,
  searchText,
  selectedDayCount,
  selectedReportDay,
  totalPages,
  onActiveFilterChange,
  onExportDetailedPdf,
  onInspectionSelect,
  onNextPage,
  onPreviousPage,
  onReportDayChange,
  onSearchTextChange,
}: InspectionTimelineSectionProps) {
  return (
    <section className="min-w-0 rounded-3xl border border-border/70 bg-card/92 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold">Inspection Timeline</h2>
        <span className="rounded-full border border-border/70 bg-background/55 px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
          {filteredCount} shown
        </span>
      </div>

      <div className="mt-3 rounded-2xl border border-border/70 bg-background/50 p-2">
        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-2 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
            placeholder="Search by meat type, location, ID..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="mt-2 grid gap-2 rounded-xl border border-border/70 bg-background/70 p-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <div className="space-y-1">
            <label
              htmlFor="inspection-day"
              className="text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              Inspection Day
            </label>
            <Input
              id="inspection-day"
              type="date"
              value={selectedReportDay}
              onChange={(event) => onReportDayChange(event.target.value)}
              className="h-9 rounded-lg bg-background/80"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-lg"
            onClick={onExportDetailedPdf}
          >
            Export PDF
          </Button>
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground">
          {hasValidReportDay
            ? `${selectedDayCount} inspection${selectedDayCount !== 1 ? "s" : ""} found for ${formattedReportDayLabel}`
            : "Pick a valid date to generate detailed day reports"}
        </p>

        <div className="mt-2 grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 sm:grid-cols-5">
          {HISTORY_FILTER_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onActiveFilterChange(option.key)}
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
        ) : filteredCount === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-background/55 py-16 text-muted-foreground">
            <ClipboardList className="mb-3 h-12 w-12" />
            <p className="font-display text-sm uppercase tracking-wider">
              No matching inspections
            </p>
            <p className="mt-1 text-xs">Try a different filter or search term</p>
          </div>
        ) : (
          <>
            {pagedInspections.map((inspection) => (
              <InspectionListItem
                key={inspection.id}
                inspection={inspection}
                onSelect={onInspectionSelect}
              />
            ))}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 rounded-xl"
                  onClick={onPreviousPage}
                  disabled={safePage === 1}
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <span className="font-display text-xs uppercase tracking-wider text-muted-foreground">
                  {safePage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 rounded-xl"
                  onClick={onNextPage}
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
  );
}
