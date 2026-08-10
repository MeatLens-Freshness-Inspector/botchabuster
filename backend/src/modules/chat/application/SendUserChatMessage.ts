import type { UserChatMessage, UserChatService } from "../infrastructure/UserChatService";
export class SendUserChatMessage {
  constructor(private readonly service: Pick<UserChatService, "sendMessage">) {}
  execute(actorId: string, recipientId: string, content: string): Promise<UserChatMessage> {
    return this.service.sendMessage(actorId, recipientId, content);
  }
}
