/** Chat module public surface. */
export { ListChatContacts } from "./application/ListChatContacts";
export { SupabaseChatContactRepository } from "./infrastructure/SupabaseChatContactRepository";
export type {
  ChatContact,
  ChatContactRepository,
  ChatContactRole,
} from "./domain/ports/ChatContactRepository";
