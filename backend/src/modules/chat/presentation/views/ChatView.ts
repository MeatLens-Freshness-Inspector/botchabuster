import type { ChatContact } from "../../domain/ports/ChatContactRepository";

/** @final */
export class ChatView {
  private constructor() {}

  static contacts(contacts: ChatContact[]): ChatContact[] {
    return contacts.map((contact) => ({ ...contact }));
  }
}
