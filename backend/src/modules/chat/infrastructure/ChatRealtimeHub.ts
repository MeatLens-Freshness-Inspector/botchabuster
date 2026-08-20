import type { UserChatMessage } from "./UserChatService";

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

export class ChatRealtimeHub {
  private readonly clients = new Map<string, ChatStreamClient>();
  private startPromise: Promise<void> | null = null;
  private stopSource: StopRealtimeSource | null = null;
  private shutdownPromise: Promise<void> | null = null;

  constructor(private readonly source: ChatRealtimeSource) {}

  async connect(client: ChatStreamClient): Promise<() => Promise<void>> {
    this.clients.set(client.id, client);

    try {
      await this.ensureSourceStarted();
    } catch (error) {
      this.clients.delete(client.id);
      throw error;
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

    this.shutdownPromise = (async () => {
      const clients = [...this.clients.values()];
      this.clients.clear();
      for (const client of clients) {
        client.close("server_shutdown");
      }
      await this.stopUpstream();
    })();

    return this.shutdownPromise;
  }

  private async ensureSourceStarted(): Promise<void> {
    if (this.stopSource) return;
    if (this.startPromise) return this.startPromise;

    this.startPromise = this.source
      .start(
        (message) => this.fanOut(message),
        () => {
          this.stopSource = null;
        },
      )
      .then((stopSource) => {
        this.stopSource = stopSource;
        for (const client of this.clients.values()) {
          client.send("status", { state: "connected" });
        }
      })
      .finally(() => {
        this.startPromise = null;
      });

    return this.startPromise;
  }

  private fanOut(message: UserChatMessage): void {
    for (const client of this.clients.values()) {
      if (client.userId === message.sender_id || client.userId === message.recipient_id) {
        client.send("message", message);
      }
    }
  }

  private async disconnect(clientId: string): Promise<void> {
    this.clients.delete(clientId);
    if (this.clients.size === 0) {
      await this.stopUpstream();
    }
  }

  private async stopUpstream(): Promise<void> {
    const stopSource = this.stopSource;
    this.stopSource = null;
    if (stopSource) await stopSource();
  }
}
