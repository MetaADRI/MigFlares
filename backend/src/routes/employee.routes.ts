import { Router } from "express";
import * as employeeController from "../controllers/employee.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { idParamsSchema } from "../validation/common.validation.js";
import {
  employeeCreateSchema,
  employeeQuerySchema,
  employeeSuspendSchema,
  employeeUpdateSchema,
} from "../validation/employee.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/", validate(employeeQuerySchema, "query"), employeeController.list);
router.post("/", validate(employeeCreateSchema), employeeController.create);
router.get("/:id/stats", validate(idParamsSchema, "params"), employeeController.stats);
router.get("/:id", validate(idParamsSchema, "params"), employeeController.get);
router.patch("/:id", validate(idParamsSchema, "params"), validate(employeeUpdateSchema), employeeController.update);
router.patch("/:id/suspend", validate(idParamsSchema, "params"), validate(employeeSuspendSchema), employeeController.suspend);
router.delete("/:id", validate(idParamsSchema, "params"), employeeController.remove);

export default router;
