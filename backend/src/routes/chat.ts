import { Router } from "express";
import { ChatController } from "../controllers/ChatController";
import { requireAuthentication } from "../middleware/auth";

const router = Router();
const controller = new ChatController();

router.post("/", requireAuthentication, (req, res) => controller.chat(req, res));

export default router;
