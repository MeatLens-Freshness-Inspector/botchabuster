import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { requireSelf } from "../middleware/auth";
import { publicAuthRateLimit } from "../middleware/rateLimit";

const router = Router();
const controller = new AuthController();

router.post("/sign-in", publicAuthRateLimit, (req, res) => controller.signIn(req, res));
router.post("/sign-up", publicAuthRateLimit, (req, res) => controller.signUp(req, res));
router.post("/sign-out", (req, res) => controller.signOut(req, res));
router.post("/passkeys/register/options", (req, res) => controller.beginPasskeyRegistration(req, res));
router.post("/passkeys/register/verify", (req, res) => controller.verifyPasskeyRegistration(req, res));
router.post("/passkeys/authenticate/options", publicAuthRateLimit, (req, res) => controller.beginPasskeyAuthentication(req, res));
router.post("/passkeys/authenticate/verify", publicAuthRateLimit, (req, res) => controller.verifyPasskeyAuthentication(req, res));
router.get("/passkeys", (req, res) => controller.listPasskeys(req, res));
router.delete("/passkeys/:credentialId", (req, res) => controller.deletePasskey(req, res));
router.post("/reset-password", publicAuthRateLimit, (req, res) => controller.sendPasswordReset(req, res));
router.patch("/users/:id/email", requireSelf("id"), (req, res) => controller.updateEmail(req, res));
router.patch("/users/:id/password", requireSelf("id"), (req, res) => controller.updatePassword(req, res));
router.post("/recovery/password", publicAuthRateLimit, (req, res) => controller.updatePasswordWithRecoveryToken(req, res));

export default router;
