import { Request, Response } from "express";
import { userChatService } from "../services/UserChatService";
import { resolveTrackedRequestAuthContext } from "../middleware/auth";

export class UserChatController {
  private async resolveActorId(req: Request): Promise<string> {
    const authContext = await resolveTrackedRequestAuthContext(req);
    return authContext.userId;
  }

  async getContacts(req: Request, res: Response): Promise<void> {
    try {
      const actorId = await this.resolveActorId(req);
      const contacts = await userChatService.listContactsForActor(actorId);
      res.json(contacts);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch chat contacts";
      const status = message.toLowerCase().includes("authentication") ? 401 : 400;
      res.status(status).json({ error: message });
    }
  }

  async getConversation(req: Request, res: Response): Promise<void> {
    try {
      const actorId = await this.resolveActorId(req);
      const counterpartId = req.params.counterpartyId;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      if (!counterpartId) {
        res.status(400).json({ error: "counterpartyId is required" });
        return;
      }

      const messages = await userChatService.listConversation(actorId, counterpartId, { limit });
      res.json(messages);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch chat conversation";
      const status = message.toLowerCase().includes("authentication") ? 401 : 400;
      res.status(status).json({ error: message });
    }
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const actorId = await this.resolveActorId(req);
      const { recipientId, content } = req.body as {
        recipientId?: string;
        content?: string;
      };

      if (!recipientId || typeof recipientId !== "string") {
        res.status(400).json({ error: "recipientId is required" });
        return;
      }

      if (typeof content !== "string") {
        res.status(400).json({ error: "content is required" });
        return;
      }

      const message = await userChatService.sendMessage(actorId, recipientId, content);
      res.status(201).json(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send chat message";
      const status = message.toLowerCase().includes("authentication") ? 401 : 400;
      res.status(status).json({ error: message });
    }
  }
}
