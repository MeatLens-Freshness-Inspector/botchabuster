import { ClipboardList, MapPin, Hash, ArrowLeft } from "lucide-react";
import { MockHotspot } from "@/components/tutorial/MockHotspot";
import type { TutorialStepDefinition } from "@/lib/tutorials/tutorialDefinitions";

interface HistoryMockSceneProps {
  step: TutorialStepDefinition;
  onAdvance: () => void;
}

function MockFreshBadge({ size = "sm" }: { size?: "sm" | "xs" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-fresh/40 bg-fresh/20 font-display font-semibold uppercase tracking-wider text-fresh ${size === "xs" ? "px-1.5 py-0.5 text-[8px]" : "px-2 py-0.5 text-[9px]"}`}
    >
      <span>OK</span> Fresh
    </span>
  );
}

const MOCK_RECORDS = [
  {
    id: "a1b2c3",
    label: "Pork",
    location: "Dagupan City Slaughterhouse",
    date: "Jun 24, 2025",
    time: "9:41 AM",
    confidence: 94,
    classification: "fresh",
  },
  {
    id: "d4e5f6",
    label: "Pork",
    location: "Dagupan Public Market",
    date: "Jun 23, 2025",
    time: "2:15 PM",
    confidence: 81,
    classification: "acceptable",
  },
];

export function HistoryMockScene({ step, onAdvance }: HistoryMockSceneProps) {
  const isOpenRecord = step.id === "history-open-record";
  const isReviewDetails = step.id === "history-review-details";
  const isBack = step.id === "history-back-to-list";

  const showDetailView = isReviewDetails || isBack;

  return (
    <div className="flex min-h-full flex-col bg-[hsl(var(--background))]">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 text-[9px] text-muted-foreground">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <span>●●●</span>
          <span>WiFi</span>
          <span>🔋</span>
        </div>
      </div>

      {/* Page header */}
      <div className="border-b border-border/60 bg-card/90 px-3 py-2.5">
        <div className="flex items-center gap-2">
          {showDetailView && (
            <MockHotspot active={isBack} onAdvance={onAdvance} label="Back">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/60">
                <ArrowLeft className="h-3.5 w-3.5 text-foreground" />
              </div>
            </MockHotspot>
          )}
          <div className="flex items-center gap-2">
            {!showDetailView && (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-[hsl(var(--primary)/0.16)]">
                <ClipboardList className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div>
              <p className="font-display text-xs font-semibold">
                {showDetailView ? "Inspection Details" : "History"}
              </p>
              <p className="text-[9px] text-muted-foreground">
                {showDetailView ? "Saved result review" : "Saved inspection records"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* List view */}
      {!showDetailView && (
        <div className="flex flex-col gap-2 p-3">
          {MOCK_RECORDS.map((record, index) => {
            const isFirst = index === 0;
            return (
              <MockHotspot
                key={record.id}
                active={isOpenRecord && isFirst}
                onAdvance={onAdvance}
                label={isFirst ? "Tap here" : undefined}
              >
                <div className="rounded-xl border border-border/60 bg-card/90 p-2.5">
                  <div className="grid grid-cols-[auto_1fr_auto] gap-2">
                    {/* Avatar tile */}
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 ${record.classification === "fresh" ? "bg-fresh/14" : "bg-acceptable/14"}`}
                    >
                      <span className="font-display text-sm text-muted-foreground">P</span>
                    </div>

                    {/* Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full border border-border/60 bg-background/70 px-1.5 py-0.5 text-[8px] uppercase tracking-widest text-muted-foreground">
                          {record.date}
                        </span>
                        {record.classification === "fresh" ? (
                          <MockFreshBadge size="xs" />
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded-md border border-acceptable/40 bg-acceptable/20 px-1.5 py-0.5 font-display text-[8px] font-semibold uppercase tracking-wider text-acceptable">
                            ~ Acceptable
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 font-display text-[10px] font-semibold capitalize">
                        {record.label}
                      </p>
                      <p className="flex items-center gap-0.5 text-[8px] text-muted-foreground">
                        <MapPin className="h-2 w-2 flex-shrink-0" />
                        <span className="truncate">{record.location}</span>
                      </p>
                    </div>

                    {/* Metrics */}
                    <div className="text-right">
                      <p
                        className={`font-display text-sm font-bold ${record.classification === "fresh" ? "text-fresh" : "text-acceptable"}`}
                      >
                        {record.confidence}%
                      </p>
                      <p className="text-[7px] uppercase tracking-widest text-muted-foreground">
                        confidence
                      </p>
                      <p className="mt-0.5 flex items-center justify-end gap-0.5 text-[7px] text-muted-foreground">
                        <Hash className="h-2 w-2" />
                        {record.id}
                      </p>
                    </div>
                  </div>
                </div>
              </MockHotspot>
            );
          })}
        </div>
      )}

      {/* Detail view */}
      {showDetailView && (
        <div className="flex flex-col gap-2 p-3">
          {/* Classification card */}
          <div className="rounded-xl border border-border/60 bg-card/90 p-2.5">
            <div className="flex items-center justify-between">
              <p className="font-display text-[9px] uppercase tracking-wider text-muted-foreground">
                Classification
              </p>
              <MockFreshBadge />
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-[8px] text-muted-foreground">
              <MapPin className="h-2 w-2" />
              <span>Dagupan City Slaughterhouse</span>
            </div>
          </div>

          {/* Confidence + details hotspot */}
          <MockHotspot active={isReviewDetails} onAdvance={onAdvance} label="Tap here">
            <div className="rounded-xl border border-border/60 bg-card/90 p-2.5">
              <p className="font-display text-[9px] uppercase tracking-wider text-muted-foreground">
                Confidence &amp; Details
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full w-[94%] rounded-full bg-fresh" />
                </div>
                <span className="font-display text-[10px] font-bold text-fresh">94%</span>
              </div>
              <p className="mt-1.5 text-[9px] leading-relaxed text-muted-foreground">
                Sample exhibits consistent coloration and firm texture indicative of fresh pork.
              </p>
            </div>
          </MockHotspot>

          {/* Back to history hint */}
          <div className="rounded-xl border border-border/60 bg-background/50 p-2">
            <p className="text-center text-[8px] text-muted-foreground">
              Tap ← in the header to return to the history list.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
