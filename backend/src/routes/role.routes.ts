import { Router } from "express";
import * as roleController from "../controllers/role.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { idParamsSchema } from "../validation/common.validation.js";
import { createUserSchema, updateUserSchema } from "../validation/user.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/permissions", requirePermission("users:view"), roleController.permissions);
router.get("/users", requirePermission("users:view"), roleController.listUsers);
router.post("/users", requirePermission("users:manage"), validate(createUserSchema), roleController.createUser);
router.patch("/users/:id", requirePermission("users:manage"), validate(idParamsSchema, "params"), validate(updateUserSchema), roleController.updateUser);
router.patch("/users/:id/role", requirePermission("users:manage"), validate(idParamsSchema, "params"), roleController.setUserRole);
router.patch("/users/:id/status", requirePermission("users:manage"), validate(idParamsSchema, "params"), roleController.setUserStatus);
router.get("/", requirePermission("users:view"), roleController.list);
router.post("/", requirePermission("users:manage"), roleController.create);
router.patch("/:id", requirePermission("users:manage"), validate(idParamsSchema, "params"), roleController.update);
router.patch("/:id/toggle", requirePermission("users:manage"), validate(idParamsSchema, "params"), roleController.toggle);

export default router;
