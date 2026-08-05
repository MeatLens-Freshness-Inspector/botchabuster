import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminDashboardPageViewModel } from "../../hooks/useAdminDashboardPage";
import {
  parsePayloadActor,
  parsePayloadSource,
  parsePayloadText,
} from "../../utils/adminDashboard";

type LogsTabContentProps = {
  dashboard: AdminDashboardPageViewModel;
};

const LogsTabContent = ({ dashboard }: LogsTabContentProps) => {
  const {
    logsLoading,
    auditLogs,
    paginatedAuditLogs,
    auditLogPage,
    totalAuditLogPages,
    setAuditLogPage,
  } = dashboard;

  return (
    <div className="space-y-4">
      <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-sm uppercase tracking-wider">
            <ShieldAlert className="h-4 w-4 text-primary" />
            Audit Logs
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-sans text-xs font-semibold text-primary">
              {auditLogs.length}
            </span>
          </CardTitle>
          <CardDescription className="text-xs">
            Encrypted audit events decoded on the backend for admin review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {logsLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : auditLogs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No audit logs found.
            </p>
          ) : (
            <>
              <div className="space-y-2.5">
                {paginatedAuditLogs.map((log) => {
                  const payload = log.payload ?? {};
                  const eventType =
                    parsePayloadText(payload, "event_type") || "unknown.event";
                  const eventTime =
                    parsePayloadText(payload, "event_time") || log.created_at;
                  const actor = parsePayloadActor(payload);
                  const source = parsePayloadSource(payload);

                  return (
                    <div
                      key={log.id}
                      className="group min-w-0 rounded-2xl border border-border/70 bg-background/60 p-2.5 transition-all hover:border-primary/40 hover:bg-background/80"
                    >
                      {/* Top Header Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-display text-xs font-semibold tracking-tight text-foreground">
                              {eventType}
                            </p>
                            <span className="shrink-0 rounded-full border border-border/70 bg-muted/60 px-2 py-0.2 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                              {log.key_id}
                            </span>
                          </div>
                          <p className="truncate text-[10px] text-muted-foreground">
                            Stored:{" "}
                            {format(
                              new Date(log.created_at),
                              "MMM d, yyyy h:mm:ss a",
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Compressed Details Ribbon */}
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 rounded-xl border border-border/40 bg-card/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                        <p className="truncate">
                          Event Time:{" "}
                          <span className="font-medium text-foreground">{eventTime}</span>
                        </p>
                        <p className="truncate">
                          Actor:{" "}
                          <span className="font-medium text-foreground">
                            {actor.role} ({actor.id || "N/A"})
                          </span>
                        </p>
                        <p className="truncate">
                          Source IP:{" "}
                          <span className="font-mono font-medium text-foreground">
                            {source.ip || "N/A"}
                          </span>
                        </p>
                        <p className="truncate sm:col-span-1">
                          Event ID:{" "}
                          <code className="rounded bg-muted px-1 py-0.2 font-mono text-[10px] text-foreground">
                            {log.client_event_id ? log.client_event_id.slice(0, 16) + "..." : "N/A"}
                          </code>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalAuditLogPages > 1 ? (
                <div className="flex items-center justify-between border-t border-border/70 pt-3 text-xs">
                  <p className="text-muted-foreground">
                    Page <span className="font-medium text-foreground">{auditLogPage}</span> of{" "}
                    <span className="font-medium text-foreground">{totalAuditLogPages}</span>
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAuditLogPage((page) => Math.max(1, page - 1))}
                      disabled={auditLogPage === 1}
                      className="h-8 px-2.5 rounded-lg"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span className="sr-only">Previous</span>
                    </Button>
                    
                    <div className="hidden sm:flex items-center gap-1">
                      {Array.from({ length: totalAuditLogPages }, (_, i) => i + 1).map((pageNum) => (
                        <Button
                          key={pageNum}
                          variant={pageNum === auditLogPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAuditLogPage(pageNum)}
                          className={`h-8 w-8 rounded-lg text-xs p-0 ${
                            pageNum === auditLogPage ? "font-bold" : "text-muted-foreground"
                          }`}
                        >
                          {pageNum}
                        </Button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setAuditLogPage((page) =>
                          Math.min(totalAuditLogPages, page + 1),
                        )
                      }
                      disabled={auditLogPage === totalAuditLogPages}
                      className="h-8 px-2.5 rounded-lg"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                      <span className="sr-only">Next</span>
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LogsTabContent;
