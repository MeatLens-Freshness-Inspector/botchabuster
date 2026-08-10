import type { AuditLogRecord } from "../infrastructure/AuditLogService";
export interface AuditLogReader { listRecent(limit?: number): Promise<AuditLogRecord[]>; }
export class ListAuditLogs {
  constructor(private readonly reader: AuditLogReader) {}
  execute(limit?: number): Promise<AuditLogRecord[]> { return this.reader.listRecent(limit); }
}
