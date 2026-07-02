import { Router } from "express";
import { AccessCodeController } from "../controllers/AccessCodeController";
import { requireAdmin } from "../middleware/auth";

const router = Router();
const controller = new AccessCodeController();

router.post("/validate", requireAdmin, (req, res) => controller.validate(req, res));
router.get("/", (req, res) => controller.getAll(req, res));
router.post("/", (req, res) => controller.create(req, res));
router.delete("/:id", (req, res) => controller.delete(req, res));
router.patch("/:id/toggle", (req, res) => controller.toggleActive(req, res));

export default router;
