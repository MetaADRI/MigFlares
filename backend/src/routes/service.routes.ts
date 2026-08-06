import { Router } from "express";
import * as serviceController from "../controllers/service.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { idParamsSchema } from "../validation/common.validation.js";
import {
  serviceCreateSchema,
  serviceQuerySchema,
  serviceUpdateSchema,
} from "../validation/service.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/", validate(serviceQuerySchema, "query"), serviceController.list);
router.post("/", validate(serviceCreateSchema), serviceController.create);
router.get("/:id", validate(idParamsSchema, "params"), serviceController.get);
router.patch("/:id", validate(idParamsSchema, "params"), validate(serviceUpdateSchema), serviceController.update);
router.delete("/:id", validate(idParamsSchema, "params"), serviceController.remove);
router.post("/:id/duplicate", validate(idParamsSchema, "params"), serviceController.duplicate);
router.patch("/:id/toggle", validate(idParamsSchema, "params"), validate(serviceUpdateSchema.pick({ isActive: true })), serviceController.toggle);

export default router;
