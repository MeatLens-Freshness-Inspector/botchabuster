import type { NextFunction, Request, Response } from "express";
import type { ChatContact } from "../../domain/ports/ChatContactRepository";
import { ChatView } from "../views/ChatView";

interface ListContactsQuery {
  execute(actorId: string): Promise<ChatContact[]>;
}

type ActorResolver = (request: Request) => Promise<{ userId: string }>;

export class ListChatContactsController {
  constructor(
    private readonly query: ListContactsQuery,
    private readonly resolveActor: ActorResolver,
  ) {}

  async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = await this.resolveActor(req);
      const contacts = await this.query.execute(userId);
      res.json(ChatView.contacts(contacts));
    } catch (error) {
      next(error);
    }
  }
}
