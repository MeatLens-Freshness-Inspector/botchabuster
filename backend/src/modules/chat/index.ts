/** Chat module public surface. */
export { ListChatContacts } from "./application/ListChatContacts";
export { SupabaseChatContactRepository } from "./infrastructure/SupabaseChatContactRepository";
export { createSupabaseChatContactRepository } from "./infrastructure/SupabaseChatFactory";
export { ListChatContactsController } from "./presentation/controllers/ListChatContactsController";
export { ChatView } from "./presentation/views/ChatView";
export {
  UserChatService,
  userChatService,
} from "./infrastructure/UserChatService";
export type {
  UserChatMessage,
  UserChatContact,
} from "./infrastructure/UserChatService";
export { default as chatRoutes } from "./presentation/routes";
export { default as userChatRoutes } from "./presentation/user-chat-routes";
export { ChatController } from "./presentation/controllers/ChatController";
export { UserChatController } from "./presentation/controllers/UserChatController";
export type {
  ChatContact,
  ChatContactRepository,
  ChatContactRole,
} from "./domain/ports/ChatContactRepository";
