import { Router } from "express";
import { DeveloperOptionsController } from "./controllers/DeveloperOptionsController";

const router = Router();
const controller = new DeveloperOptionsController();

router.post("/unlock", (req, res) => controller.unlock(req, res));
router.post("/verify", (req, res) => controller.verify(req, res));

export default router;
