import { UserId } from "../../users/domain/UserId";
import type { ChatContact, ChatContactRepository } from "../domain/ports/ChatContactRepository";

export class ListChatContacts {
  constructor(private readonly chatContactRepository: ChatContactRepository) {}

  execute(rawActorId: string): Promise<ChatContact[]> {
    const actorId = UserId.create(rawActorId);
    return this.chatContactRepository.listContacts(actorId.value);
  }
}
