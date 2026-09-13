import React from "react";
import type { InspectionResultDispute } from "@/entities/inspection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function statusLabel(status: InspectionResultDispute["status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function developerLabel(dispute: InspectionResultDispute): string {
  return dispute.developer_label_applied_at
    ? `Applied · ${formatDate(dispute.developer_label_applied_at)}`
    : "Not applied";
}

export type DisputeHistoryTableProps = {
  disputes: InspectionResultDispute[];
};

export function DisputeHistoryTable({ disputes }: DisputeHistoryTableProps) {
  if (disputes.length === 0) {
    return (
      <section aria-labelledby="dispute-history-heading" className="rounded-[32px] border border-border/70 bg-card/95 p-5">
        <h3 id="dispute-history-heading" className="font-display text-base font-semibold tracking-tight">Dispute history</h3>
        <p className="mt-6 py-8 text-center text-sm text-muted-foreground">No disputes found in this date range.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="dispute-history-heading" className="min-w-0 rounded-[32px] border border-border/70 bg-card/95 p-5">
      <div className="mb-4">
        <h3 id="dispute-history-heading" className="font-display text-base font-semibold tracking-tight">Dispute history</h3>
        <p className="mt-1 text-sm text-muted-foreground">All disputes created within the selected report range.</p>
      </div>
      <div className="w-full overflow-x-auto">
        <Table className="min-w-[1380px]">
          <caption className="sr-only">Complete inspection result dispute history</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Dispute ID</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Inspection ID</TableHead>
              <TableHead>Submitter</TableHead>
              <TableHead>Meat type</TableHead>
              <TableHead>Model classification</TableHead>
              <TableHead>Expected classification</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Reviewed</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead>Reviewer note</TableHead>
              <TableHead>Developer label</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {disputes.map((dispute) => (
              <TableRow key={dispute.id}>
                <TableCell className="font-mono text-xs">{dispute.id}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(dispute.created_at)}</TableCell>
                <TableCell className="font-mono text-xs">{dispute.inspection_id || "-"}</TableCell>
                <TableCell className="font-mono text-xs">{dispute.submitted_by || "-"}</TableCell>
                <TableCell className="capitalize">{dispute.inspection?.meat_type ?? "-"}</TableCell>
                <TableCell className="capitalize">{dispute.inspection?.classification ?? "-"}</TableCell>
                <TableCell className="capitalize">{dispute.expected_classification || "-"}</TableCell>
                <TableCell>
                  <span className="inline-flex rounded-full border border-border/70 px-2 py-1 text-xs font-medium">
                    {statusLabel(dispute.status)}
                  </span>
                </TableCell>
                <TableCell className="max-w-[260px] whitespace-normal">{dispute.reason || "-"}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(dispute.reviewed_at)}</TableCell>
                <TableCell className="font-mono text-xs">{dispute.reviewed_by || "-"}</TableCell>
                <TableCell className="max-w-[240px] whitespace-normal">{dispute.reviewer_note || "-"}</TableCell>
                <TableCell className="whitespace-nowrap">{developerLabel(dispute)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
