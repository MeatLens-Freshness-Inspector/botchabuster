import { useState } from "react";
import type { Inspection, FreshnessClassification } from "@/types/inspection";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getConfidenceFillClass, getConfidenceTextClass } from "@/lib/confidenceLevel";
import { formatInspectionLocationLabel } from "@/lib/inspectionLocation";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  MapPin,
  Hash,
  CalendarDays,
  FileText,
  AlertTriangle,
  ImageOff,
  Beef,
  Clock,
} from "lucide-react";

interface InspectionDetailSheetProps {
  inspection: Inspection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CLASSIFICATION_COLORS: Record<FreshnessClassification, string> = {
  fresh: "bg-[hsl(var(--fresh)/0.14)] border-[hsl(var(--fresh)/0.35)]",
  "not fresh": "bg-[hsl(var(--warning)/0.14)] border-[hsl(var(--warning)/0.35)]",
  acceptable: "bg-[hsl(var(--acceptable)/0.14)] border-[hsl(var(--acceptable)/0.35)]",
  warning: "bg-[hsl(var(--warning)/0.14)] border-[hsl(var(--warning)/0.35)]",
  spoiled: "bg-[hsl(var(--spoiled)/0.14)] border-[hsl(var(--spoiled)/0.35)]",
};

export function InspectionDetailSheet({ inspection, open, onOpenChange }: InspectionDetailSheetProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  if (!inspection) return null;

  const confidenceFillClass = getConfidenceFillClass(inspection.confidence_score);
  const confidenceTextClass = getConfidenceTextClass(inspection.confidence_score);
  const classificationColor = CLASSIFICATION_COLORS[inspection.classification];
  const locationLabel = formatInspectionLocationLabel(
    inspection.location,
    inspection.location_latitude,
    inspection.location_longitude,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] w-[min(96vw,520px)] overflow-hidden rounded-2xl border border-border/70 bg-background p-0">
        {/* Scrollable body */}
        <div className="overflow-y-auto px-5 pb-6 pt-5" style={{ maxHeight: "80vh" }}>
          <DialogHeader className="mb-4 text-left">
            <div className="flex items-start justify-between gap-3 pr-6">
              <div>
                <DialogTitle className="font-display text-lg font-semibold capitalize">
                  {inspection.meat_type}
                </DialogTitle>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Hash className="h-3 w-3" />
                  {inspection.id.slice(0, 12)}…
                </p>
              </div>
              <FreshnessBadge classification={inspection.classification} size="lg" />
            </div>
          </DialogHeader>

          {/* Image */}
          {inspection.image_url ? (
            <>
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="group mb-4 block w-full cursor-zoom-in overflow-hidden rounded-xl border border-border/70 bg-muted"
                aria-label="Enlarge inspection image"
              >
                <img
                  src={inspection.image_url}
                  alt={`${inspection.meat_type} inspection`}
                  className="max-h-48 w-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
                />
                <p className="pb-1.5 text-center text-[10px] text-muted-foreground/70">Tap to enlarge</p>
              </button>

              {/* Lightbox */}
              <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                <DialogContent className="max-w-[95vw] border-none bg-transparent p-0 shadow-none sm:max-w-4xl [&>button]:text-white [&>button]:opacity-80">
                  <DialogTitle className="sr-only">Enlarged inspection image</DialogTitle>
                  <img
                    src={inspection.image_url}
                    alt={`${inspection.meat_type} inspection – full size`}
                    className="max-h-[88vh] w-full rounded-2xl border border-white/10 object-contain shadow-2xl"
                  />
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <div className="mb-4 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-card py-7 text-muted-foreground">
              <ImageOff className="h-7 w-7" />
              <p className="text-xs">No image captured</p>
            </div>
          )}

          {/* Classification banner */}
          <div className={cn("mb-4 rounded-xl border p-3", classificationColor)}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Classification</p>
              <FreshnessBadge classification={inspection.classification} size="sm" />
            </div>
            <p className="text-[10px] font-display uppercase tracking-widest text-muted-foreground mt-2">
              Confidence
            </p>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn("h-full rounded-full transition-all", confidenceFillClass)}
                  style={{ width: `${inspection.confidence_score}%` }}
                />
              </div>
              <span className={cn("font-display text-sm font-bold", confidenceTextClass)}>
                {inspection.confidence_score}%
              </span>
            </div>
          </div>

          {/* Meta grid */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                <CalendarDays className="h-3 w-3" /> Date
              </p>
              <p className="mt-1 text-xs font-semibold">
                {format(new Date(inspection.created_at), "MMM d, yyyy")}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                <Clock className="h-3 w-3" /> Time
              </p>
              <p className="mt-1 text-xs font-semibold">
                {format(new Date(inspection.created_at), "h:mm a")}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                <Beef className="h-3 w-3" /> Meat Type
              </p>
              <p className="mt-1 text-xs font-semibold capitalize">{inspection.meat_type}</p>
            </div>
            {locationLabel && (
              <div className="rounded-xl border border-border/70 bg-card p-3">
                <p className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <MapPin className="h-3 w-3" /> Location
                </p>
                <p className="mt-1 break-words text-xs font-semibold leading-snug">{locationLabel}</p>
              </div>
            )}
          </div>

          {/* Analysis / Explanation */}
          {inspection.explanation && (
            <section className="mb-4">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-display uppercase tracking-widest text-muted-foreground">
                <FileText className="h-3.5 w-3.5" /> Analysis
              </p>
              <div className="rounded-xl border border-border/70 bg-card p-3">
                <p className="text-sm leading-relaxed text-secondary-foreground">
                  {inspection.explanation}
                </p>
              </div>
            </section>
          )}

          {/* Flagged Deviations */}
          {inspection.flagged_deviations.length > 0 && (
            <section className="mb-4">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-display uppercase tracking-widest text-warning">
                <AlertTriangle className="h-3.5 w-3.5" /> Flagged Deviations
              </p>
              <ul className="space-y-1.5">
                {inspection.flagged_deviations.map((deviation, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-xl border border-warning/25 bg-[hsl(var(--warning)/0.08)] px-3 py-2 text-xs text-muted-foreground"
                  >
                    <span className="mt-0.5 text-warning">⚠</span>
                    {deviation}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Inspector Notes */}
          {inspection.inspector_notes && (
            <section>
              <p className="mb-2 text-[10px] font-display uppercase tracking-widest text-muted-foreground">
                Inspector Notes
              </p>
              <div className="rounded-xl border border-border/70 bg-card p-3">
                <p className="text-sm leading-relaxed text-secondary-foreground italic">
                  "{inspection.inspector_notes}"
                </p>
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
