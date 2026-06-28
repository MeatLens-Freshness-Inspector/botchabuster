import { format } from "date-fns";
import { ClipboardList, Trash2 } from "lucide-react";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AdminDashboardPageViewModel } from "../../hooks/useAdminDashboardPage";
import { getInspectorLabel } from "../../utils/adminDashboard";

type InspectionsTabContentProps = {
  dashboard: AdminDashboardPageViewModel;
};

const InspectionsTabContent = ({ dashboard }: InspectionsTabContentProps) => {
  const {
    inspections,
    filteredInspections,
    inspectorFilter,
    profileById,
    setInspectorFilter,
    setPreviewImageUrl,
    handleDeleteInspection,
  } = dashboard;

  return (
    <Card className="rounded-3xl border-border/70 bg-card/95">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-display uppercase tracking-wider">
          <ClipboardList className="h-4 w-4" />
          All Inspections
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Filter by inspector name..."
            value={inspectorFilter}
            onChange={(event) => setInspectorFilter(event.target.value)}
            className="h-10 rounded-xl"
          />
          {inspectorFilter.trim() ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Showing {filteredInspections.length} of {inspections.length} inspection
              {inspections.length !== 1 ? "s" : ""}
            </p>
          ) : null}
        </div>
        {filteredInspections.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {inspectorFilter.trim()
              ? `No inspections found for "${inspectorFilter.trim()}"`
              : "No inspections yet"}
          </p>
        ) : (
          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            {filteredInspections.map((inspection) => (
              <div
                key={inspection.id}
                className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-background/50 p-3"
              >
                <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-3">
                  {inspection.image_url ? (
                    <button
                      type="button"
                      className="h-14 w-14 flex-shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-border/70 touch-manipulation sm:h-16 sm:w-16"
                      onClick={() => setPreviewImageUrl(inspection.image_url)}
                      onTouchEnd={() => setPreviewImageUrl(inspection.image_url)}
                      aria-label="View full inspection image"
                    >
                      <img
                        src={inspection.image_url}
                        alt="Sample"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ) : (
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-border/70 bg-secondary sm:h-16 sm:w-16">
                      <span className="font-display text-lg text-muted-foreground">
                        {inspection.meat_type[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="truncate font-display text-sm font-semibold capitalize">
                        {inspection.meat_type}
                      </span>
                      <FreshnessBadge
                        classification={inspection.classification}
                        size="sm"
                      />
                    </div>
                    <p className="truncate text-xs font-medium text-foreground/80">
                      {getInspectorLabel(
                        inspection.user_id
                          ? profileById.get(inspection.user_id)
                          : undefined,
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(inspection.created_at), "MMM d, yyyy h:mm a")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Confidence: {inspection.confidence_score}%
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      ID: {inspection.id}
                    </p>
                  </div>
                  <div className="col-span-2 flex justify-end border-t border-border/60 pt-2 sm:col-span-1 sm:block sm:border-t-0 sm:pt-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-xl border-border/70 text-destructive hover:text-destructive sm:h-9 sm:w-9"
                      onClick={() => void handleDeleteInspection(inspection.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InspectionsTabContent;
