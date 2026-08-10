import type {
  ChatContact,
  ChatContactRepository,
  ChatContactRole,
} from "../domain/ports/ChatContactRepository";

interface RpcResult<T> {
  data: T | null;
  error: { message: string } | null;
}

interface ChatContactsRpcClient {
  rpc<T = unknown>(functionName: string, args?: Record<string, unknown>): PromiseLike<RpcResult<T>>;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseContact(value: Record<string, unknown>): ChatContact {
  if (typeof value.id !== "string") throw new Error("Chat contact id is invalid");
  if (value.role !== "admin" && value.role !== "user") throw new Error("Chat contact role is invalid");

  return {
    id: value.id,
    full_name: nullableString(value.full_name),
    email: nullableString(value.email),
    inspector_code: nullableString(value.inspector_code),
    location: nullableString(value.location),
    role: value.role as ChatContactRole,
    last_message_preview: nullableString(value.last_message_preview),
    last_message_at: nullableString(value.last_message_at),
  };
}

export class SupabaseChatContactRepository implements ChatContactRepository {
  constructor(private readonly client: ChatContactsRpcClient) {}

  async listContacts(actorId: string): Promise<ChatContact[]> {
    const { data, error } = await this.client.rpc<Array<Record<string, unknown>>>(
      "get_user_chat_contacts",
      { _actor_id: actorId },
    );
    if (error) throw new Error(`Failed to fetch chat contacts: ${error.message}`);
    return (data ?? []).map(parseContact);
  }
}
