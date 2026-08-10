export type ChatContactRole = "admin" | "user";

export interface ChatContact {
  id: string;
  full_name: string | null;
  email: string | null;
  inspector_code: string | null;
  location: string | null;
  role: ChatContactRole;
  last_message_preview: string | null;
  last_message_at: string | null;
}

export interface ChatContactRepository {
  listContacts(actorId: string): Promise<ChatContact[]>;
}
