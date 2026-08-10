/** Chat module public surface. */
export { ListChatContacts } from "./application/ListChatContacts";
export { SupabaseChatContactRepository } from "./infrastructure/SupabaseChatContactRepository";
export { ListChatContactsController } from "./presentation/controllers/ListChatContactsController";
export { ChatView } from "./presentation/views/ChatView";
export type {
  ChatContact,
  ChatContactRepository,
  ChatContactRole,
} from "./domain/ports/ChatContactRepository";
