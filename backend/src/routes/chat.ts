import { Router } from "express";
import { ChatController } from "../controllers/ChatController";
import { requireAuthentication } from "../middleware/auth";
import { chatRateLimit } from "../middleware/rateLimit";

const router = Router();
const controller = new ChatController();

router.post("/", requireAuthentication, chatRateLimit, (req, res) => controller.chat(req, res));

export default router;
