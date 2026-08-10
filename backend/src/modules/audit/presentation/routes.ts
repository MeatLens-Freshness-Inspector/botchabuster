import { Router } from "express";
import { AuditLogController } from "./controllers/AuditLogController";

const router = Router();
const controller = new AuditLogController();

router.get("/", (req, res) => controller.list(req, res));
router.post("/", (req, res) => controller.create(req, res));

export default router;
