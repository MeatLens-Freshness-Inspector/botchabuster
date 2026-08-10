import crypto from "crypto";
import { supabase } from "../../../integrations/supabase";
import { Config } from "../../../config";

export type AuditLogPayload = Record<string, unknown>;

export type AuditLogWriteInput = {
  clientEventId?: string;
  payload: AuditLogPayload;
};

type EncryptedPayload = {
  ciphertext: string;
  iv: string;
  tag: string;
  keyId: string;
};

export type AuditLogRecord = {
  id: string;
  client_event_id: string;
  key_id: string;
  created_at: string;
  payload: AuditLogPayload;
};

export class AuditLogService {
  private static instance: AuditLogService;
  private readonly tableName = "audit_logs";
  private readonly key: Buffer;
  private readonly keyId: string;

  private constructor() {
    const config = Config.getInstance();
    this.key = this.parseKey(config.auditLogKey);
    this.keyId = config.auditLogKeyId;
  }

  static getInstance(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
    }
    return AuditLogService.instance;
  }

  private parseKey(value: string): Buffer {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error("AUDIT_LOG_KEY is required");
    }

    if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length === 64) {
      return Buffer.from(trimmed, "hex");
    }

    const decoded = Buffer.from(trimmed, "base64");
    if (decoded.length !== 32) {
      throw new Error("AUDIT_LOG_KEY must decode to 32 bytes for AES-256-GCM");
    }

    return decoded;
  }

  private encryptPayload(payload: AuditLogPayload): EncryptedPayload {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.key, iv);

    const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      ciphertext: ciphertext.toString("base64"),
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      keyId: this.keyId,
    };
  }

  private decodeRequiredBase64(value: string, label: string): Buffer {
    if (!value || !value.trim()) {
      throw new Error(`${label} is required`);
    }

    const decoded = Buffer.from(value, "base64");
    if (decoded.length === 0) {
      throw new Error(`${label} is invalid`);
    }

    return decoded;
  }

  private decryptPayload(encrypted: EncryptedPayload): AuditLogPayload {
    if (encrypted.keyId !== this.keyId) {
      throw new Error(`Unsupported audit log key id: ${encrypted.keyId}`);
    }

    const iv = this.decodeRequiredBase64(encrypted.iv, "Audit log iv");
    const tag = this.decodeRequiredBase64(encrypted.tag, "Audit log tag");
    const ciphertext = this.decodeRequiredBase64(encrypted.ciphertext, "Audit log ciphertext");

    const decipher = crypto.createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(tag);

    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(plaintext) as AuditLogPayload;
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Audit log payload is invalid");
    }
    return parsed;
  }

  async write(event: AuditLogWriteInput): Promise<void> {
    const clientEventId = event.clientEventId || crypto.randomUUID();
    const encrypted = this.encryptPayload(event.payload);

    const { error } = await (supabase
      .from(this.tableName) as any)
      .insert({
        client_event_id: clientEventId,
        payload_ciphertext: encrypted.ciphertext,
        payload_iv: encrypted.iv,
        payload_tag: encrypted.tag,
        key_id: encrypted.keyId,
      });

    if (error) {
      throw new Error(`Failed to write audit log: ${error.message}`);
    }
  }

  async writeBatch(events: AuditLogWriteInput[]): Promise<number> {
    if (events.length === 0) return 0;

    const rows = events.map((event) => {
      const clientEventId = event.clientEventId || crypto.randomUUID();
      const encrypted = this.encryptPayload(event.payload);

      return {
        client_event_id: clientEventId,
        payload_ciphertext: encrypted.ciphertext,
        payload_iv: encrypted.iv,
        payload_tag: encrypted.tag,
        key_id: encrypted.keyId,
      };
    });

    const { error } = await (supabase
      .from(this.tableName) as any)
      .upsert(rows, { onConflict: "client_event_id", ignoreDuplicates: true });

    if (error) {
      throw new Error(`Failed to write audit logs: ${error.message}`);
    }

    return rows.length;
  }

  async listRecent(limit = 100): Promise<AuditLogRecord[]> {
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 500) : 100;

    const { data, error } = await (supabase
      .from(this.tableName) as any)
      .select("id, client_event_id, payload_ciphertext, payload_iv, payload_tag, key_id, created_at")
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) {
      throw new Error(`Failed to list audit logs: ${error.message}`);
    }

    const rows = Array.isArray(data) ? data : [];
    return rows.map((row) => {
      try {
        return {
          id: row.id,
          client_event_id: row.client_event_id,
          key_id: row.key_id,
          created_at: row.created_at,
          payload: this.decryptPayload({
            ciphertext: row.payload_ciphertext,
            iv: row.payload_iv,
            tag: row.payload_tag,
            keyId: row.key_id,
          }),
        };
      } catch (error) {
        return {
          id: row.id,
          client_event_id: row.client_event_id,
          key_id: row.key_id,
          created_at: row.created_at,
          payload: {
            event_type: "audit.decrypt_error",
            event_time: row.created_at,
            data: {
              reason: error instanceof Error ? error.message : "Failed to decrypt audit log entry",
            },
          },
        };
      }
    });
  }
}

export const auditLogService = AuditLogService.getInstance();
