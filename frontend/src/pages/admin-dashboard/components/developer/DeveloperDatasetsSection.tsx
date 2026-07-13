import React from "react";
import { Download, ImageIcon, RotateCcw, Search } from "lucide-react";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  DeveloperDatasetFilterState,
  DeveloperDatasetListResponse,
} from "@/integrations/api/DeveloperDashboardClient";
import type { FreshnessClassification } from "@/types/inspection";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function formatConfidencePercent(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${value.toFixed(2)}%`;
}

const CLASSIFICATION_OPTIONS: Array<{
  value: FreshnessClassification;
  label: string;
}> = [
  { value: "fresh", label: "Fresh" },
  { value: "acceptable", label: "Acceptable" },
  { value: "warning", label: "Warning" },
  { value: "not fresh", label: "Not fresh" },
  { value: "spoiled", label: "Spoiled" },
];

export function DeveloperDatasetsSection({
  datasets,
  filters,
  onFiltersChange,
  onManualClassificationChange,
  onPageChange,
  onExport,
  isExporting,
  isLoading,
}: {
  datasets: DeveloperDatasetListResponse | null;
  filters: DeveloperDatasetFilterState;
  onFiltersChange: (next: DeveloperDatasetFilterState) => void;
  onManualClassificationChange: (inspectionId: string, classification: FreshnessClassification) => void | Promise<void>;
  onPageChange: (offset: number) => void | Promise<void>;
  onExport: () => Promise<void>;
  isExporting: boolean;
  isLoading: boolean;
}) {
  const total = datasets?.total ?? 0;
  const currentOffset = datasets?.offset ?? filters.offset;
  const limit = datasets?.limit ?? filters.limit;
  const nextOffset = currentOffset + limit;
  const previousOffset = Math.max(0, currentOffset - limit);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Datasets</h2>
          <p className="text-sm text-muted-foreground">Inspection records and image assets prepared for local training export.</p>
        </div>
        <Button
          type="button"
          onClick={() => void onExport()}
          disabled={isExporting}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {isExporting ? "Exporting..." : "Export Dataset"}
        </Button>
      </div>

      <Card className="border-border/70 bg-card/90">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 pt-0 md:grid-cols-3 xl:grid-cols-6">
          <Input
            value={filters.location}
            onChange={(event) => onFiltersChange({ ...filters, location: event.target.value, offset: 0 })}
            placeholder="Location"
          />
          <Input
            value={filters.inspector}
            onChange={(event) => onFiltersChange({ ...filters, inspector: event.target.value, offset: 0 })}
            placeholder="Inspector user ID"
          />
          <Input
            value={filters.meatType}
            onChange={(event) => onFiltersChange({ ...filters, meatType: event.target.value, offset: 0 })}
            placeholder="Meat type"
          />
          <Input
            value={filters.classification}
            onChange={(event) => onFiltersChange({ ...filters, classification: event.target.value, offset: 0 })}
            placeholder="Manual classification"
          />
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => onFiltersChange({ ...filters, dateFrom: event.target.value, offset: 0 })}
            aria-label="Date from"
          />
          <select
            value={filters.hasImage === null ? "all" : String(filters.hasImage)}
            onChange={(event) => {
              const value = event.target.value;
              onFiltersChange({
                ...filters,
                hasImage: value === "all" ? null : value === "true",
                offset: 0,
              });
            }}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            aria-label="Image filter"
          >
            <option value="all">All image states</option>
            <option value="true">With image</option>
            <option value="false">No image</option>
          </select>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/90">
        <CardHeader className="flex-row items-center justify-between gap-3 p-4 pb-2">
          <CardTitle className="text-base">Inspection Records</CardTitle>
          <span className="text-sm text-muted-foreground">
            {isLoading ? "Loading..." : `${total} records`}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Meat</TableHead>
                <TableHead>Model Classification</TableHead>
                <TableHead>Manual Classification</TableHead>
                <TableHead>Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(datasets?.items ?? []).map((inspection) => (
                <TableRow key={inspection.id}>
                  <TableCell>
                    {inspection.image_url ? (
                      <img
                        src={inspection.image_url}
                        alt={`Inspection ${inspection.id}`}
                        className="h-14 w-14 rounded-md border border-border/70 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-border/70 text-muted-foreground">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateTime(inspection.created_at)}</TableCell>
                  <TableCell>{inspection.user_id ?? "-"}</TableCell>
                  <TableCell>{inspection.location ?? "-"}</TableCell>
                  <TableCell>{inspection.meat_type}</TableCell>
                  <TableCell>
                    <FreshnessBadge classification={inspection.classification} size="sm" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <select
                        value={inspection.manual_classification ?? inspection.classification}
                        onChange={(event) => {
                          const nextClassification = event.target.value as FreshnessClassification;
                          void onManualClassificationChange(inspection.id, nextClassification);
                        }}
                        className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        aria-label={`Manual classification for inspection ${inspection.id}`}
                      >
                        {CLASSIFICATION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {(inspection.manual_classification ?? inspection.classification) !== inspection.classification ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void onManualClassificationChange(inspection.id, inspection.classification)}
                          aria-label={`Reset manual classification for inspection ${inspection.id}`}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{formatConfidencePercent(inspection.confidence_score)}</TableCell>
                </TableRow>
              ))}
              {!isLoading && (datasets?.items.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No inspection records match the current filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => void onPageChange(previousOffset)}
          disabled={isLoading || currentOffset === 0}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void onPageChange(nextOffset)}
          disabled={isLoading || nextOffset >= total}
        >
          Next
        </Button>
      </div>
    </section>
  );
}
