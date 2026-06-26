import { format } from "date-fns";
import type { UserChatContact } from "@/integrations/api/UserChatClient";

export function formatContactName(contact: UserChatContact): string {
  return (
    contact.full_name?.trim() ||
    contact.email?.trim() ||
    contact.inspector_code?.trim() ||
    "Unnamed"
  );
}

export function formatTimestamp(isoString: string | null): string {
  if (!isoString) return "No messages yet";

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "No messages yet";

  return format(date, "MMM d, h:mm a");
}
