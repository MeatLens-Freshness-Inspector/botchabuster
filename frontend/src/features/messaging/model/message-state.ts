import type { UserChatContact, UserChatMessage } from "@/entities/message";

function compareMessages(left: UserChatMessage, right: UserChatMessage): number {
  return left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id);
}

function compareContacts(left: UserChatContact, right: UserChatContact): number {
  const leftActivity = left.last_message_at ?? "";
  const rightActivity = right.last_message_at ?? "";
  return rightActivity.localeCompare(leftActivity) || left.id.localeCompare(right.id);
}

function getCounterpartyId(message: UserChatMessage, currentUserId: string): string | null {
  if (message.sender_id === currentUserId) return message.recipient_id;
  if (message.recipient_id === currentUserId) return message.sender_id;
  return null;
}

export function upsertMessages(
  current: readonly UserChatMessage[],
  incoming: readonly UserChatMessage[],
): UserChatMessage[] {
  const byId = new Map<string, UserChatMessage>();
  for (const message of current) byId.set(message.id, message);
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(compareMessages);
}

export function isConversationMessage(
  message: UserChatMessage,
  currentUserId: string,
  counterpartyId: string,
): boolean {
  return (
    (message.sender_id === currentUserId && message.recipient_id === counterpartyId) ||
    (message.recipient_id === currentUserId && message.sender_id === counterpartyId)
  );
}

export function applyMessageToContacts(
  contacts: readonly UserChatContact[],
  message: UserChatMessage,
  currentUserId: string,
): UserChatContact[] {
  const counterpartyId = getCounterpartyId(message, currentUserId);
  if (!counterpartyId || !contacts.some(({ id }) => id === counterpartyId)) return [...contacts];

  return contacts
    .map((contact) => {
      if (contact.id !== counterpartyId) return contact;
      if (contact.last_message_at && contact.last_message_at > message.created_at) return contact;
      return {
        ...contact,
        last_message_preview: message.content,
        last_message_at: message.created_at,
      };
    })
    .sort(compareContacts);
}

export function mergeContactSnapshots(
  current: readonly UserChatContact[],
  snapshot: readonly UserChatContact[],
): UserChatContact[] {
  const currentById = new Map(current.map((contact) => [contact.id, contact]));
  return snapshot
    .map((contact) => {
      const existing = currentById.get(contact.id);
      if (
        existing?.last_message_at &&
        (!contact.last_message_at || existing.last_message_at >= contact.last_message_at)
      ) {
        return {
          ...contact,
          last_message_preview: existing.last_message_preview,
          last_message_at: existing.last_message_at,
        };
      }
      return contact;
    })
    .sort(compareContacts);
}
