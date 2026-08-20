import type { UserChatMessage } from "./UserChatService";

export const CHAT_RETRY_DELAYS_MS = [1_000, 2_000, 5_000, 15_000, 30_000] as const;
export const MAX_CHAT_STREAMS = 100;
export const MAX_CHAT_STREAMS_PER_USER = 2;

export type StopRealtimeSource = () => Promise<void> | void;

export interface ChatRealtimeSource {
  start(
    onInsert: (message: UserChatMessage) => void,
    onDisconnect: (error: Error) => void,
  ): Promise<StopRealtimeSource>;
}

export type ChatStreamEvent = "message" | "status";

export interface ChatStreamClient {
  id: string;
  userId: string;
  createdAt: number;
  send(event: ChatStreamEvent, data: unknown): boolean;
  close(reason: string): void;
}

type ScheduledHandle = unknown;

interface ChatRealtimeHubOptions {
  maxClients?: number;
  maxClientsPerUser?: number;
  retryDelaysMs?: readonly number[];
  schedule?: (callback: () => void, delayMs: number) => ScheduledHandle;
  cancelSchedule?: (handle: ScheduledHandle) => void;
}

export class ChatConnectionLimitError extends Error {
  constructor(public readonly scope: "user" | "instance") {
    super(scope === "instance" ? "Chat stream capacity reached" : "User chat stream capacity reached");
  }
}

export class ChatRealtimeHub {
  private readonly clients = new Map<string, ChatStreamClient>();
  private readonly maxClients: number;
  private readonly maxClientsPerUser: number;
  private readonly retryDelaysMs: readonly number[];
  private readonly schedule: (callback: () => void, delayMs: number) => ScheduledHandle;
  private readonly cancelSchedule: (handle: ScheduledHandle) => void;

  private startPromise: Promise<void> | null = null;
  private stopSource: StopRealtimeSource | null = null;
  private retryHandle: ScheduledHandle | null = null;
  private retryIndex = 0;
  private retriesExhausted = false;
  private sourceGeneration = 0;
  private shuttingDown = false;
  private shutdownPromise: Promise<void> | null = null;

  constructor(
    private readonly source: ChatRealtimeSource,
    options: ChatRealtimeHubOptions = {},
  ) {
    this.maxClients = options.maxClients ?? MAX_CHAT_STREAMS;
    this.maxClientsPerUser = options.maxClientsPerUser ?? MAX_CHAT_STREAMS_PER_USER;
    this.retryDelaysMs = options.retryDelaysMs ?? CHAT_RETRY_DELAYS_MS;
    this.schedule = options.schedule ?? ((callback, delayMs) => setTimeout(callback, delayMs));
    this.cancelSchedule = options.cancelSchedule ?? ((handle) => clearTimeout(handle as NodeJS.Timeout));
  }

  connect(client: ChatStreamClient): () => Promise<void> {
    if (this.shuttingDown) throw new Error("Chat realtime hub is shutting down");

    this.evictOldestUserClientIfNeeded(client.userId);
    if (this.clients.size >= this.maxClients) {
      throw new ChatConnectionLimitError("instance");
    }

    this.clients.set(client.id, client);
    if (this.retriesExhausted && !this.stopSource && !this.startPromise) {
      this.retriesExhausted = false;
      this.retryIndex = 0;
    }
    if (this.stopSource) {
      queueMicrotask(() => {
        if (this.clients.has(client.id)) client.send("status", { state: "connected" });
      });
    } else {
      void this.ensureSourceStarted();
    }

    let disconnected = false;
    return async () => {
      if (disconnected) return;
      disconnected = true;
      await this.disconnect(client.id);
    };
  }

  async shutdown(): Promise<void> {
    if (this.shutdownPromise) return this.shutdownPromise;

    this.shuttingDown = true;
    this.shutdownPromise = (async () => {
      this.cancelRetry();
      this.sourceGeneration += 1;
      const clients = [...this.clients.values()];
      this.clients.clear();
      for (const client of clients) client.close("server_shutdown");
      await this.stopUpstream();
    })();

    return this.shutdownPromise;
  }

  private evictOldestUserClientIfNeeded(userId: string): void {
    const userClients = [...this.clients.values()]
      .filter((client) => client.userId === userId)
      .sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));

    if (userClients.length < this.maxClientsPerUser) return;
    const oldest = userClients[0];
    this.clients.delete(oldest.id);
    oldest.close("replaced_by_newer_stream");
  }

  private async ensureSourceStarted(): Promise<void> {
    if (
      this.shuttingDown ||
      this.clients.size === 0 ||
      this.stopSource ||
      this.retryHandle !== null ||
      this.retriesExhausted
    ) return;
    if (this.startPromise) return this.startPromise;

    const generation = ++this.sourceGeneration;
    const startPromise = this.source
      .start(
        (message) => {
          if (generation === this.sourceGeneration) this.fanOut(message);
        },
        (error) => {
          if (generation === this.sourceGeneration) void this.handleSourceFailure(error);
        },
      )
      .then(async (stopSource) => {
        if (generation !== this.sourceGeneration || this.clients.size === 0 || this.shuttingDown) {
          await stopSource();
          return;
        }

        this.stopSource = stopSource;
        this.retryIndex = 0;
        this.retriesExhausted = false;
        this.notifyStatus({ state: "connected" });
      })
      .catch(async (error: unknown) => {
        if (generation !== this.sourceGeneration) return;
        await this.handleSourceFailure(error instanceof Error ? error : new Error(String(error)));
      })
      .finally(() => {
        if (this.startPromise === startPromise) this.startPromise = null;
      });

    this.startPromise = startPromise;
    await startPromise;
  }

  private async handleSourceFailure(_error: Error): Promise<void> {
    if (this.shuttingDown || this.clients.size === 0) return;

    this.sourceGeneration += 1;
    await this.stopUpstream();
    if (this.retryHandle !== null) return;

    if (this.retryIndex >= this.retryDelaysMs.length) {
      this.retriesExhausted = true;
      this.notifyStatus({ state: "realtime_unavailable" });
      return;
    }

    const delayMs = this.retryDelaysMs[this.retryIndex];
    this.retryIndex += 1;
    this.retryHandle = this.schedule(() => {
      this.retryHandle = null;
      void this.ensureSourceStarted();
    }, delayMs);
  }

  private fanOut(message: UserChatMessage): void {
    for (const client of this.clients.values()) {
      if (client.userId !== message.sender_id && client.userId !== message.recipient_id) continue;
      if (!client.send("message", message)) void this.disconnect(client.id);
    }
  }

  private notifyStatus(status: { state: "connected" | "realtime_unavailable" }): void {
    for (const client of this.clients.values()) {
      if (!client.send("status", status)) void this.disconnect(client.id);
    }
  }

  private async disconnect(clientId: string): Promise<void> {
    this.clients.delete(clientId);
    if (this.clients.size > 0) return;

    this.cancelRetry();
    this.sourceGeneration += 1;
    this.retryIndex = 0;
    this.retriesExhausted = false;
    await this.stopUpstream();
  }

  private cancelRetry(): void {
    if (this.retryHandle === null) return;
    this.cancelSchedule(this.retryHandle);
    this.retryHandle = null;
  }

  private async stopUpstream(): Promise<void> {
    const stopSource = this.stopSource;
    this.stopSource = null;
    if (stopSource) await stopSource();
  }
}
