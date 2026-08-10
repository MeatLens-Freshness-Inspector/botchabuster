import { Router } from "express";
import { ProfileController } from "./controllers/ProfileController";
import { requireAdmin, requireSelfOrAdmin } from "../../../middleware/auth";
import { GetProfileController, GetProfile, ProfileServiceGateway } from "..";
import { profileService } from "../infrastructure/ProfileService";

const router = Router();
const controller = new ProfileController();
const getProfileController = new GetProfileController(
  new GetProfile(new ProfileServiceGateway(profileService)),
);

// GET stats must come before :id to avoid ambiguity
router.get("/stats", requireAdmin, (req, res) => controller.getUserStats(req, res));
router.get("/", requireAdmin, (req, res) => controller.getAllProfiles(req, res));
router.post("/admin/users", requireAdmin, (req, res) => controller.createUserByAdmin(req, res));
router.put("/admin/users/:id", requireAdmin, (req, res) => controller.updateUserByAdmin(req, res));
router.delete("/admin/users/:id", requireAdmin, (req, res) => controller.deleteUserByAdmin(req, res));
router.get("/:id", requireSelfOrAdmin("id"), (req, res, next) => {
  void getProfileController.handle(req, res, next);
});
router.put("/:id", requireSelfOrAdmin("id"), (req, res) => controller.updateProfile(req, res));
router.get("/:userId/has-role/:role", requireSelfOrAdmin("userId"), (req, res) => controller.checkUserRole(req, res));

export default router;
