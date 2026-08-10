import type { AuditLogWriteInput } from "../infrastructure/AuditLogService";
export interface AuditLogWriter { writeBatch(events: AuditLogWriteInput[]): Promise<number>; }
export class WriteAuditLogBatch {
  constructor(private readonly writer: AuditLogWriter) {}
  execute(events: AuditLogWriteInput[]): Promise<number> { return this.writer.writeBatch(events); }
}
