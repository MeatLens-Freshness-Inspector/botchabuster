import type { UserChatMessage, UserChatService } from "../infrastructure/UserChatService";
export class ListConversation {
  constructor(private readonly service: Pick<UserChatService, "listConversation">) {}
  execute(actorId: string, counterpartId: string, limit?: number): Promise<UserChatMessage[]> {
    return this.service.listConversation(actorId, counterpartId, { limit });
  }
}
