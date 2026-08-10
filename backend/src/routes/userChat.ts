import { Router } from "express";
import { UserChatController } from "../controllers/UserChatController";
import { resolveTrackedRequestAuthContext } from "../middleware/auth";
import {
  ListChatContacts,
  ListChatContactsController,
  createSupabaseChatContactRepository,
} from "../modules/chat";

const router = Router();
const controller = new UserChatController();
const listChatContactsController = new ListChatContactsController(
  new ListChatContacts(createSupabaseChatContactRepository()),
  resolveTrackedRequestAuthContext,
);

router.get("/contacts", (req, res, next) => {
  void listChatContactsController.handle(req, res, next);
});
router.get("/messages/:counterpartyId", (req, res) => controller.getConversation(req, res));
router.post("/messages", (req, res) => controller.sendMessage(req, res));

export default router;
