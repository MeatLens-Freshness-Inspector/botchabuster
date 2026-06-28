import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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
    <div className="mt-6 space-y-4">
      <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle className="font-display text-sm uppercase tracking-wider">
            Audit Logs
          </CardTitle>
          <CardDescription className="text-xs">
            Recent encrypted audit events decoded on the backend for admin review.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <div className="space-y-3">
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
                      className="rounded-2xl border border-border/70 bg-background/50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm font-semibold tracking-tight">
                            {eventType}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Stored{" "}
                            {format(
                              new Date(log.created_at),
                              "MMM d, yyyy h:mm:ss a",
                            )}
                          </p>
                        </div>
                        <span className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {log.key_id}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                        <p className="truncate">Event Time: {eventTime}</p>
                        <p className="truncate">Actor Role: {actor.role}</p>
                        <p className="truncate">Actor ID: {actor.id}</p>
                        <p className="truncate">Source IP: {source.ip}</p>
                        <p className="truncate md:col-span-2">
                          User Agent: {source.userAgent}
                        </p>
                        <p className="truncate md:col-span-2">
                          Client Event ID: {log.client_event_id}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {totalAuditLogPages > 1 ? (
                <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-4">
                  <p className="text-xs text-muted-foreground">
                    Page {auditLogPage} of {totalAuditLogPages}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAuditLogPage((page) => Math.max(1, page - 1))}
                      disabled={auditLogPage === 1}
                      className="h-8 px-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Previous</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setAuditLogPage((page) =>
                          Math.min(totalAuditLogPages, page + 1),
                        )
                      }
                      disabled={auditLogPage === totalAuditLogPages}
                      className="h-8 px-2"
                    >
                      <ChevronRight className="h-4 w-4" />
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
