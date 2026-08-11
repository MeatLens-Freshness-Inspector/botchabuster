export interface UserChatContact {
  id: string;
  full_name: string | null;
  email: string | null;
  inspector_code: string | null;
  location: string | null;
  role: "admin" | "user";
  last_message_preview: string | null;
  last_message_at: string | null;
}

export interface UserChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
}
