import { useState } from "react";
import type { Inspection } from "@/types/inspection";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getConfidenceTextClass } from "@/lib/confidenceLevel";
import { formatInspectionLocationLabel } from "@/lib/inspectionLocation";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { MapPin, Hash } from "lucide-react";

interface InspectionListItemProps {
  inspection: Inspection;
  onClick?: () => void;
  onSelect?: (inspection: Inspection) => void;
  className?: string;
}

export function InspectionListItem({ inspection, onClick, onSelect, className }: InspectionListItemProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const confidenceTextClass = getConfidenceTextClass(inspection.confidence_score);
  const locationLabel = formatInspectionLocationLabel(
    inspection.location,
    inspection.location_latitude,
    inspection.location_longitude,
  );

  const surfaceByClass = {
    fresh: "bg-[hsl(var(--fresh)/0.14)]",
    "not fresh": "bg-[hsl(var(--warning)/0.14)]",
    acceptable: "bg-[hsl(var(--acceptable)/0.14)]",
    warning: "bg-[hsl(var(--warning)/0.14)]",
    spoiled: "bg-[hsl(var(--spoiled)/0.14)]",
  }[inspection.classification];

  return (
    <Card
      className={cn(
        "cursor-pointer rounded-2xl border border-border/70 bg-card/95 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_35px_-24px_rgba(0,0,0,0.75)]",
        className
      )}
      onClick={() => { onClick?.(); onSelect?.(inspection); }}
    >
      <CardContent
        data-testid="inspection-card-layout"
        className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
      >
        {inspection.image_url ? (
          <button
            type="button"
            className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-border/70 touch-manipulation cursor-zoom-in sm:h-16 sm:w-16"
            onClick={(event) => {
              event.stopPropagation();
              setIsPreviewOpen(true);
            }}
            onTouchEnd={(event) => {
              event.stopPropagation();
              setIsPreviewOpen(true);
            }}
            aria-label="View full inspection image"
          >
            <img src={inspection.image_url} alt="Sample" className="h-full w-full object-cover" />
          </button>
        ) : (
          <div className={cn("flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-border/70 sm:h-16 sm:w-16", surfaceByClass)}>
            <span className="font-display text-lg text-muted-foreground">{inspection.meat_type[0].toUpperCase()}</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border/70 bg-background/65 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              {format(new Date(inspection.created_at), "MMM d, yyyy")}
            </span>
            <FreshnessBadge classification={inspection.classification} size="sm" />
          </div>

          <p className="font-display text-sm font-semibold capitalize truncate">{inspection.meat_type}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(inspection.created_at), "h:mm a")}</p>

          {locationLabel && (
            <p className="mt-1 flex items-start gap-1 break-words text-xs leading-snug text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span>{locationLabel}</span>
            </p>
          )}
        </div>

        <div
          data-testid="inspection-metrics"
          className="col-span-2 flex items-end justify-between gap-3 border-t border-border/60 pt-2 sm:col-span-1 sm:block sm:border-t-0 sm:pt-0 sm:text-right"
        >
          <p className={cn("font-display text-lg font-bold", confidenceTextClass)}>{inspection.confidence_score}%</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">confidence</p>
          <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
            <Hash className="h-3 w-3" />
            {inspection.id.slice(0, 6)}
          </p>
        </div>
      </CardContent>

      {inspection.image_url && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="w-[min(96vw,980px)] max-w-5xl border-none bg-transparent p-0 shadow-none">
            <img
              src={inspection.image_url}
              alt="Inspection full view"
              className="max-h-[85vh] w-full rounded-2xl border border-border/70 bg-black/60 object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
