import { supabase } from "../../../integrations/supabase";
import { ChatRealtimeHub, type ChatRealtimeSource, type StopRealtimeSource } from "./ChatRealtimeHub";
import type { UserChatMessage } from "./UserChatService";

type RealtimeStatus = "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR" | string;

interface RealtimeChannelPort {
  on(
    eventType: "postgres_changes",
    filter: { event: "INSERT"; schema: "public"; table: "user_chat_messages" },
    callback: (payload: { new?: unknown }) => void,
  ): RealtimeChannelPort;
  subscribe(callback: (status: RealtimeStatus, error?: Error) => void): RealtimeChannelPort;
}

interface SupabaseRealtimeClientPort {
  channel(name: string): RealtimeChannelPort;
  removeChannel(channel: RealtimeChannelPort): Promise<unknown>;
}

interface ActiveChannel {
  channel: RealtimeChannelPort;
  stopping: boolean;
  stopPromise: Promise<void> | null;
}

const FAILURE_STATUSES = new Set(["TIMED_OUT", "CLOSED", "CHANNEL_ERROR"]);

function parseMessage(value: unknown): UserChatMessage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const keys = ["id", "sender_id", "recipient_id", "content", "created_at"] as const;
  if (keys.some((key) => typeof row[key] !== "string")) return null;

  return {
    id: row.id as string,
    sender_id: row.sender_id as string,
    recipient_id: row.recipient_id as string,
    content: row.content as string,
    created_at: row.created_at as string,
  };
}

export class SupabaseChatRealtimeSource implements ChatRealtimeSource {
  private active: ActiveChannel | null = null;

  constructor(
    private readonly client: SupabaseRealtimeClientPort = supabase as unknown as SupabaseRealtimeClientPort,
  ) {}

  async start(
    onInsert: (message: UserChatMessage) => void,
    onDisconnect: (error: Error) => void,
  ): Promise<StopRealtimeSource> {
    if (this.active) throw new Error("Chat realtime source is already active");

    const channel = this.client.channel("user-chat-inserts");
    const active: ActiveChannel = { channel, stopping: false, stopPromise: null };
    this.active = active;

    const stop = async (): Promise<void> => {
      if (active.stopPromise) return active.stopPromise;
      active.stopping = true;
      active.stopPromise = Promise.resolve(this.client.removeChannel(channel)).then(() => {
        if (this.active === active) this.active = null;
      });
      return active.stopPromise;
    };

    return new Promise<StopRealtimeSource>((resolve, reject) => {
      let subscribed = false;
      let settled = false;

      channel
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "user_chat_messages" },
          (payload) => {
            const message = parseMessage(payload.new);
            if (message) onInsert(message);
          },
        )
        .subscribe((status, suppliedError) => {
          if (status === "SUBSCRIBED") {
            subscribed = true;
            if (!settled) {
              settled = true;
              resolve(stop);
            }
            return;
          }

          if (!FAILURE_STATUSES.has(status) || active.stopping) return;
          const error = suppliedError ?? new Error(`Supabase Realtime ${status}`);
          if (subscribed) {
            onDisconnect(error);
            return;
          }

          if (!settled) {
            settled = true;
            void stop().then(() => reject(error), reject);
          }
        });
    });
  }
}

export const supabaseChatRealtimeSource = new SupabaseChatRealtimeSource();
export const chatRealtimeHub = new ChatRealtimeHub(supabaseChatRealtimeSource);
