import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { requireSelf } from "../middleware/auth";

const router = Router();
const controller = new AuthController();

router.post("/sign-in", (req, res) => controller.signIn(req, res));
router.post("/sign-up", (req, res) => controller.signUp(req, res));
router.post("/sign-out", (req, res) => controller.signOut(req, res));
router.post("/passkeys/register/options", (req, res) => controller.beginPasskeyRegistration(req, res));
router.post("/passkeys/register/verify", (req, res) => controller.verifyPasskeyRegistration(req, res));
router.post("/passkeys/authenticate/options", (req, res) => controller.beginPasskeyAuthentication(req, res));
router.post("/passkeys/authenticate/verify", (req, res) => controller.verifyPasskeyAuthentication(req, res));
router.get("/passkeys", (req, res) => controller.listPasskeys(req, res));
router.delete("/passkeys/:credentialId", (req, res) => controller.deletePasskey(req, res));
router.post("/reset-password", (req, res) => controller.sendPasswordReset(req, res));
router.patch("/users/:id/email", requireSelf("id"), (req, res) => controller.updateEmail(req, res));
router.patch("/users/:id/password", requireSelf("id"), (req, res) => controller.updatePassword(req, res));
router.post("/recovery/password", (req, res) => controller.updatePasswordWithRecoveryToken(req, res));

export default router;
