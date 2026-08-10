import type { UserChatContact, UserChatService } from "../infrastructure/UserChatService";
export class ListUserChatContacts {
  constructor(private readonly service: Pick<UserChatService, "listContactsForActor">) {}
  execute(actorId: string): Promise<UserChatContact[]> { return this.service.listContactsForActor(actorId); }
}
