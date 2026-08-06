import { Router } from "express";
import * as notificationController from "../controllers/notification.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { idParamsSchema } from "../validation/common.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/", notificationController.list);
router.patch("/read-all", notificationController.markAllRead);
router.patch("/:id/read", validate(idParamsSchema, "params"), notificationController.markRead);
router.delete("/:id", validate(idParamsSchema, "params"), notificationController.remove);

export default router;
