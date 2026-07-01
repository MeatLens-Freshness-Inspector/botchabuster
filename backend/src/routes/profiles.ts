import { Router } from "express";
import { ProfileController } from "../controllers/ProfileController";
import { requireAdmin, requireSelfOrAdmin } from "../middleware/auth";

const router = Router();
const controller = new ProfileController();

// GET stats must come before :id to avoid ambiguity
router.get("/stats", requireAdmin, (req, res) => controller.getUserStats(req, res));
router.get("/", requireAdmin, (req, res) => controller.getAllProfiles(req, res));
router.post("/admin/users", requireAdmin, (req, res) => controller.createUserByAdmin(req, res));
router.put("/admin/users/:id", requireAdmin, (req, res) => controller.updateUserByAdmin(req, res));
router.delete("/admin/users/:id", requireAdmin, (req, res) => controller.deleteUserByAdmin(req, res));
router.get("/:id", requireSelfOrAdmin("id"), (req, res) => controller.getProfile(req, res));
router.put("/:id", requireSelfOrAdmin("id"), (req, res) => controller.updateProfile(req, res));
router.get("/:userId/has-role/:role", requireSelfOrAdmin("userId"), (req, res) => controller.checkUserRole(req, res));

export default router;
