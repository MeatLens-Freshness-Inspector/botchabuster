import { useCallback, useState } from "react";
import { toast } from "sonner";
import { auditLogClient, type AuditLogEntry } from "@/entities/audit-log";

export function useLogsTab() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadAuditLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      setAuditLogs(await auditLogClient.listRecent(200));
    } catch (error) {
      console.error("Failed to load audit logs:", error);
      const message = error instanceof Error && error.message ? error.message : "Failed to load audit logs";
      toast.error(message);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  return { auditLogs, loadAuditLogs, logsLoading };
}
