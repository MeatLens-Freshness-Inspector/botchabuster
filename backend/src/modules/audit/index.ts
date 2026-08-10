/** Audit module public surface. */
export { AuditLogService, auditLogService } from "./infrastructure/AuditLogService";
export type {
  AuditLogPayload,
  AuditLogRecord,
  AuditLogWriteInput,
} from "./infrastructure/AuditLogService";
export { default as auditRoutes } from "./presentation/routes";
export { AuditLogController } from "./presentation/controllers/AuditLogController";
