import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { loginSchema, refreshSchema, registerSchema } from "../validation/auth.validation.js";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", validate(refreshSchema), authController.refresh);
router.post("/logout", requireAuth, authController.logout);
router.get("/me", requireAuth, authController.me);
router.patch("/profile", requireAuth, authController.updateProfile);
router.patch("/password", requireAuth, authController.changePassword);
router.get("/logins", requireAuth, authController.loginHistory);

export default router;
