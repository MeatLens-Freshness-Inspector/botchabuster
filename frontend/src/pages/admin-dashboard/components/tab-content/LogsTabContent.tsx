import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  Code,
  Copy,
  Check,
  Loader2,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui";
import { Input } from "@/shared/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SmartPagination } from "@/components/ui/SmartPagination";
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
  const { logsLoading, auditLogs } = dashboard;

  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter logs based on search query
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return auditLogs;
    const q = searchQuery.toLowerCase().trim();

    return auditLogs.filter((log) => {
      const payload = log.payload ?? {};
      const eventType = parsePayloadText(payload, "event_type") || "unknown.event";
      const actor = parsePayloadActor(payload);
      const source = parsePayloadSource(payload);
      const keyId = log.key_id || "";
      const clientEventId = log.client_event_id || "";

      return (
        eventType.toLowerCase().includes(q) ||
        keyId.toLowerCase().includes(q) ||
        clientEventId.toLowerCase().includes(q) ||
        actor.role.toLowerCase().includes(q) ||
        (actor.id && actor.id.toLowerCase().includes(q)) ||
        (source.ip && source.ip.toLowerCase().includes(q)) ||
        JSON.stringify(payload).toLowerCase().includes(q)
      );
    });
  }, [auditLogs, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedLogs = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, safeCurrentPage, pageSize]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (val: string) => {
    setPageSize(Number(val));
    setCurrentPage(1);
  };

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, label: string, key: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedId(key);
        toast.success(`${label} copied to clipboard`);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(() => {
        toast.error(`Failed to copy ${label.toLowerCase()}`);
      });
  };

  return (
    <div className="space-y-4 min-w-0">
      <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="pb-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 font-display text-sm uppercase tracking-wider">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Audit Logs
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-sans text-xs font-semibold text-primary">
                  {filteredLogs.length}
                  {searchQuery && ` (filtered from ${auditLogs.length})`}
                </span>
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Encrypted audit events decoded on the backend for admin review.
              </CardDescription>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Per page:</span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="h-8 w-[75px] text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by event type, actor, IP, key ID..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-9 pr-9 h-9 text-xs rounded-2xl bg-background/50 border-border/70 focus-visible:ring-primary/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 min-w-0">
          {logsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs font-medium">Loading audit logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No audit logs match your search filter." : "No audit logs found."}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="h-8 text-xs rounded-xl"
                >
                  Clear search filter
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Scrollable Container for Log Items */}
              <div className="max-h-[580px] overflow-y-auto pr-1 space-y-2.5 min-w-0">
                {paginatedLogs.map((log) => {
                  const payload = log.payload ?? {};
                  const eventType =
                    parsePayloadText(payload, "event_type") || "unknown.event";
                  const eventTime =
                    parsePayloadText(payload, "event_time") || log.created_at;
                  const actor = parsePayloadActor(payload);
                  const source = parsePayloadSource(payload);
                  const isExpanded = !!expandedLogIds[log.id];

                  return (
                    <div
                      key={log.id}
                      className="group min-w-0 rounded-2xl border border-border/70 bg-background/60 p-3 transition-all hover:border-primary/40 hover:bg-background/80"
                    >
                      {/* Top Header Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-display text-xs font-semibold tracking-tight text-foreground">
                              {eventType}
                            </p>
                            <span className="shrink-0 rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                              {log.key_id}
                            </span>
                          </div>
                          <p className="truncate text-[10px] text-muted-foreground mt-0.5">
                            Stored:{" "}
                            {format(
                              new Date(log.created_at),
                              "MMM d, yyyy h:mm:ss a",
                            )}
                          </p>
                        </div>

                        {/* Action Buttons: Expand JSON & Copy Payload */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(log.id)}
                            className="h-7 px-2 text-[11px] rounded-lg gap-1 text-muted-foreground hover:text-foreground"
                          >
                            <Code className="h-3 w-3" />
                            {isExpanded ? "Hide Payload" : "View Payload"}
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Compressed Details Ribbon */}
                      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 rounded-xl border border-border/40 bg-card/60 px-3 py-2 text-[11px] text-muted-foreground">
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
                        <div className="flex items-center gap-1 min-w-0 truncate">
                          <span className="shrink-0">Source IP:</span>
                          <span className="font-mono font-medium text-foreground truncate">
                            {source.ip || "N/A"}
                          </span>
                          {source.ip && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(source.ip, "Source IP", `ip-${log.id}`)}
                              className="text-muted-foreground hover:text-foreground shrink-0 ml-1"
                              title="Copy IP"
                            >
                              {copiedId === `ip-${log.id}` ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1 min-w-0 truncate">
                          <span className="shrink-0">Event ID:</span>
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground truncate">
                            {log.client_event_id || "N/A"}
                          </code>
                          {log.client_event_id && (
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(log.client_event_id!, "Event ID", `eid-${log.id}`)
                              }
                              className="text-muted-foreground hover:text-foreground shrink-0 ml-1"
                              title="Copy Event ID"
                            >
                              {copiedId === `eid-${log.id}` ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable JSON Payload Drawer */}
                      {isExpanded && (
                        <div className="mt-2.5 space-y-1.5 animate-in fade-in-50 duration-150">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                            <span className="font-medium font-mono text-[10px]">Payload Details</span>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(
                                  JSON.stringify(payload, null, 2),
                                  "Payload JSON",
                                  `json-${log.id}`
                                )
                              }
                              className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                            >
                              {copiedId === `json-${log.id}` ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-500" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" /> Copy JSON
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="max-h-60 overflow-x-auto rounded-xl border border-border/50 bg-muted/70 p-3 font-mono text-[10px] leading-relaxed text-foreground select-text">
                            {JSON.stringify(payload, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Clean Non-Overflowing Smart Pagination */}
              <div className="border-t border-border/70 pt-3">
                <SmartPagination
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredLogs.length}
                  pageSize={pageSize}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LogsTabContent;
