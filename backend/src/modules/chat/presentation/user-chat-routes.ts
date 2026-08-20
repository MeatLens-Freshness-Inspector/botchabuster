import { Router } from "express";
import { UserChatController } from "./controllers/UserChatController";
import { resolveTrackedRequestAuthContext } from "../../../middleware/auth";
import {
  ListChatContacts,
  ListChatContactsController,
  createSupabaseChatContactRepository,
} from "..";
import { ChatEventsController } from "./controllers/ChatEventsController";

const router = Router();
const controller = new UserChatController();
const listChatContactsController = new ListChatContactsController(
  new ListChatContacts(createSupabaseChatContactRepository()),
  resolveTrackedRequestAuthContext,
);
const chatEventsController = new ChatEventsController();

router.get("/contacts", (req, res, next) => {
  void listChatContactsController.handle(req, res, next);
});
router.get("/messages/:counterpartyId", (req, res) => controller.getConversation(req, res));
router.get("/events", (req, res) => {
  void chatEventsController.handle(req, res);
});
router.post("/messages", (req, res) => controller.sendMessage(req, res));

export default router;
