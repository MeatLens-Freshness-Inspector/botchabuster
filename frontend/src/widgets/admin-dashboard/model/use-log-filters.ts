import { useMemo, useState } from "react";
import type { AuditLogEntry } from "@/entities/audit-log";

const AUDIT_LOGS_PER_PAGE = 5;

export function useLogFilters(auditLogs: AuditLogEntry[]) {
  const [auditLogPage, setAuditLogPage] = useState(1);
  const paginatedAuditLogs = useMemo(
    () => auditLogs.slice((auditLogPage - 1) * AUDIT_LOGS_PER_PAGE, auditLogPage * AUDIT_LOGS_PER_PAGE),
    [auditLogPage, auditLogs],
  );

  return {
    auditLogPage,
    auditLogsPerPage: AUDIT_LOGS_PER_PAGE,
    paginatedAuditLogs,
    setAuditLogPage,
    totalAuditLogPages: Math.ceil(auditLogs.length / AUDIT_LOGS_PER_PAGE),
  };
}
