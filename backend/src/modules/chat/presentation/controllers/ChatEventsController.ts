import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { Config } from "../../../../config";
import { isOriginAllowed } from "../../../../config/cors";
import {
  getErrorStatus,
  resolveTrackedRequestAuthContext,
} from "../../../../middleware/auth";
import { getAppSessionService } from "../../../auth/infrastructure/AppSessionService";
import { BufferedSseConnection, type SseWriter } from "../../infrastructure/BufferedSseConnection";
import {
  ChatConnectionLimitError,
  type ChatRealtimeHub,
} from "../../infrastructure/ChatRealtimeHub";
import { chatRealtimeHub } from "../../infrastructure/SupabaseChatRealtimeSource";

const HEARTBEAT_INTERVAL_MS = 25_000;
type TimerHandle = unknown;

interface ChatEventsControllerOptions {
  hub?: Pick<ChatRealtimeHub, "connect">;
  authenticate?: (req: Request) => Promise<{ userId: string }>;
  allowedOrigins?: readonly string[];
  idleTimeoutSeconds?: number;
  nowMs?: () => number;
  getAbsoluteExpiryMs?: (accessToken: string | undefined) => number | null;
  createConnectionId?: () => string;
  setInterval?: (callback: () => void, delayMs: number) => TimerHandle;
  clearInterval?: (handle: TimerHandle) => void;
  setTimeout?: (callback: () => void, delayMs: number) => TimerHandle;
  clearTimeout?: (handle: TimerHandle) => void;
}

function resolveAbsoluteExpiryMs(accessToken: string | undefined): number | null {
  if (!accessToken) return null;
  try {
    const appSessions = getAppSessionService();
    if (!appSessions.looksLikeAppSessionToken(accessToken)) return null;
    return appSessions.getSession(accessToken).expiresAt * 1000;
  } catch {
    return null;
  }
}

export class ChatEventsController {
  private readonly hub: Pick<ChatRealtimeHub, "connect">;
  private readonly authenticate: (req: Request) => Promise<{ userId: string }>;
  private readonly allowedOrigins: readonly string[];
  private readonly idleTimeoutSeconds: number;
  private readonly nowMs: () => number;
  private readonly getAbsoluteExpiryMs: (accessToken: string | undefined) => number | null;
  private readonly createConnectionId: () => string;
  private readonly setIntervalFn: (callback: () => void, delayMs: number) => TimerHandle;
  private readonly clearIntervalFn: (handle: TimerHandle) => void;
  private readonly setTimeoutFn: (callback: () => void, delayMs: number) => TimerHandle;
  private readonly clearTimeoutFn: (handle: TimerHandle) => void;

  constructor(options: ChatEventsControllerOptions = {}) {
    const config = Config.getInstance();
    this.hub = options.hub ?? chatRealtimeHub;
    this.authenticate = options.authenticate ?? resolveTrackedRequestAuthContext;
    this.allowedOrigins = options.allowedOrigins ?? config.allowedOrigins;
    this.idleTimeoutSeconds = options.idleTimeoutSeconds ?? config.sessionIdleTimeoutSeconds;
    this.nowMs = options.nowMs ?? (() => Date.now());
    this.getAbsoluteExpiryMs = options.getAbsoluteExpiryMs ?? resolveAbsoluteExpiryMs;
    this.createConnectionId = options.createConnectionId ?? randomUUID;
    this.setIntervalFn = options.setInterval ?? ((callback, delayMs) => setInterval(callback, delayMs));
    this.clearIntervalFn = options.clearInterval ?? ((handle) => clearInterval(handle as NodeJS.Timeout));
    this.setTimeoutFn = options.setTimeout ?? ((callback, delayMs) => setTimeout(callback, delayMs));
    this.clearTimeoutFn = options.clearTimeout ?? ((handle) => clearTimeout(handle as NodeJS.Timeout));
  }

  async handle(req: Request, res: Response): Promise<void> {
    if (!isOriginAllowed(req.header("origin"), this.allowedOrigins)) {
      res.status(403).json({ error: "Origin not allowed" });
      return;
    }

    let heartbeatHandle: TimerHandle | null = null;
    let rotationHandle: TimerHandle | null = null;
    let disconnectHub: (() => Promise<void>) | null = null;
    let connection: BufferedSseConnection | null = null;
    let cleaned = false;
    let transportClosed = Boolean((req as Request & { destroyed?: boolean }).destroyed || (res as Response & { destroyed?: boolean }).destroyed);
    const closeFromTransport = () => {
      transportClosed = true;
      void cleanup("client_closed", true);
    };

    const cleanup = async (reason: string, closeResponse: boolean): Promise<void> => {
      if (cleaned) return;
      cleaned = true;
      if (heartbeatHandle !== null) this.clearIntervalFn(heartbeatHandle);
      if (rotationHandle !== null) this.clearTimeoutFn(rotationHandle);
      const disconnect = disconnectHub;
      disconnectHub = null;
      if (disconnect) await disconnect();
      if (closeResponse && connection) connection.close(reason);
    };

    req.once("close", closeFromTransport);
    res.once("close", closeFromTransport);

    try {
      const auth = await this.authenticate(req);
      if (transportClosed || (req as Request & { destroyed?: boolean }).destroyed || res.writableEnded) {
        await cleanup("client_closed", false);
        return;
      }
      connection = new BufferedSseConnection({
        id: this.createConnectionId(),
        userId: auth.userId,
        createdAt: this.nowMs(),
        writer: res as unknown as SseWriter,
        onClose: (reason) => {
          void cleanup(reason, false);
        },
      });
      disconnectHub = this.hub.connect(connection);
      if (transportClosed || res.writableEnded) {
        await cleanup("client_closed", true);
        return;
      }

      res.status(200).set({
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.flushHeaders();
      connection.send("status", { state: "connecting" });

      heartbeatHandle = this.setIntervalFn(() => {
        if (!connection?.sendComment("heartbeat")) void cleanup("heartbeat_failed", false);
      }, HEARTBEAT_INTERVAL_MS);

      const idleDeadlineMs = this.nowMs() + this.idleTimeoutSeconds * 1000;
      const absoluteDeadlineMs = this.getAbsoluteExpiryMs(req.authAccessToken) ?? Number.POSITIVE_INFINITY;
      const rotationDelayMs = Math.max(1, Math.min(idleDeadlineMs, absoluteDeadlineMs) - this.nowMs());
      rotationHandle = this.setTimeoutFn(() => {
        void cleanup("stream_rotation", true);
      }, rotationDelayMs);

    } catch (error) {
      if (error instanceof ChatConnectionLimitError) {
        res.status(429).set({ "Retry-After": "60" }).json({ error: error.message });
        return;
      }

      const status = getErrorStatus(error) ?? 500;
      const message = status < 500 && error instanceof Error
        ? error.message
        : "Failed to open chat stream";
      res.status(status).json({ error: message });
    }
  }
}
