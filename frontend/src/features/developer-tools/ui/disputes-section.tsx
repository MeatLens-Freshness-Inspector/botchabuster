import React, { useState } from "react";
import { Check, Database, X } from "lucide-react";
import type { InspectionResultDispute } from "@/entities/inspection";
import { Button, Label } from "@/shared/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function InspectionDisputeReviewSection({
  disputes,
  isLoading,
  canApplyDeveloperLabel,
  onApplyDeveloperLabel,
  onReview,
}: {
  disputes: InspectionResultDispute[];
  isLoading: boolean;
  canApplyDeveloperLabel: boolean;
  onApplyDeveloperLabel: (disputeId: string) => Promise<unknown>;
  onReview: (disputeId: string, decision: "approved" | "rejected", reviewerNote: string | null) => Promise<unknown>;
}) {
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (disputeId: string, operation: () => Promise<unknown>) => {
    setBusyId(disputeId);
    try {
      await operation();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Result Disputes</h2>
        <p className="text-sm text-muted-foreground">
          Review inspector corrections. Developer labels update the training dataset only; approval changes the official record.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading disputes...</p>}
      {!isLoading && disputes.length === 0 && (
        <Card className="border-border/70 bg-card/90">
          <CardContent className="p-5 text-sm text-muted-foreground">There are no pending result disputes.</CardContent>
        </Card>
      )}

      {disputes.map((dispute) => {
        const note = reviewNotes[dispute.id] ?? "";
        const isBusy = busyId === dispute.id;
        return (
          <Card key={dispute.id} className="border-border/70 bg-card/90">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                <span>{dispute.inspection?.meat_type ?? "Inspection"} · {dispute.inspection_id.slice(0, 12)}</span>
                <span className="rounded-full bg-warning/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-warning">Pending</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">Submitted {formatDate(dispute.created_at)} by {dispute.submitted_by}</p>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-2">
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <div><p className="text-xs text-muted-foreground">Model result</p><p className="font-semibold capitalize">{dispute.inspection?.classification ?? "-"}</p></div>
                <div><p className="text-xs text-muted-foreground">Expected result</p><p className="font-semibold capitalize">{dispute.expected_classification}</p></div>
                <div><p className="text-xs text-muted-foreground">Developer label</p><p className="font-semibold">{dispute.developer_label_applied_at ? "Applied" : "Not applied"}</p></div>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm leading-relaxed">{dispute.reason}</div>
              <div className="space-y-1.5">
                <Label htmlFor={`review-note-${dispute.id}`}>Review note</Label>
                <textarea
                  id={`review-note-${dispute.id}`}
                  value={note}
                  onChange={(event) => setReviewNotes((current) => ({ ...current, [dispute.id]: event.target.value }))}
                  maxLength={2000}
                  rows={2}
                  placeholder="Optional note for the audit trail"
                  className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {canApplyDeveloperLabel && (
                  <Button type="button" size="sm" variant="outline" disabled={isBusy || Boolean(dispute.developer_label_applied_at)} onClick={() => void run(dispute.id, () => onApplyDeveloperLabel(dispute.id))}>
                    <Database className="mr-1.5 h-4 w-4" />
                    {dispute.developer_label_applied_at ? "Developer label applied" : "Apply developer label"}
                  </Button>
                )}
                <Button type="button" size="sm" disabled={isBusy} onClick={() => void run(dispute.id, () => onReview(dispute.id, "approved", note.trim() || null))}>
                  <Check className="mr-1.5 h-4 w-4" /> Approve official result
                </Button>
                <Button type="button" size="sm" variant="destructive" disabled={isBusy} onClick={() => void run(dispute.id, () => onReview(dispute.id, "rejected", note.trim() || null))}>
                  <X className="mr-1.5 h-4 w-4" /> Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
