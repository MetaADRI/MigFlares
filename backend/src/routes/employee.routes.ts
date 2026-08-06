import { Router } from "express";
import * as employeeController from "../controllers/employee.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { idParamsSchema } from "../validation/common.validation.js";
import {
  clockInOutSchema,
  employeeCreateSchema,
  employeeQuerySchema,
  employeeSuspendSchema,
  employeeUpdateSchema,
  salaryPaymentSchema,
} from "../validation/employee.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/", validate(employeeQuerySchema, "query"), employeeController.list);
router.post("/", validate(employeeCreateSchema), employeeController.create);
router.get("/:id/stats", validate(idParamsSchema, "params"), employeeController.stats);
router.get("/:id/salary-history", validate(idParamsSchema, "params"), employeeController.salaryHistory);
router.post(
  "/:id/salary-payments",
  validate(idParamsSchema, "params"),
  validate(salaryPaymentSchema),
  employeeController.recordSalary,
);
router.get("/:id/time-entries", validate(idParamsSchema, "params"), employeeController.timeEntries);
router.post("/:id/clock-in", validate(idParamsSchema, "params"), validate(clockInOutSchema), employeeController.clockIn);
router.post("/:id/clock-out", validate(idParamsSchema, "params"), validate(clockInOutSchema), employeeController.clockOut);
router.get("/:id", validate(idParamsSchema, "params"), employeeController.get);
router.patch("/:id", validate(idParamsSchema, "params"), validate(employeeUpdateSchema), employeeController.update);
router.patch("/:id/suspend", validate(idParamsSchema, "params"), validate(employeeSuspendSchema), employeeController.suspend);
router.delete("/:id", validate(idParamsSchema, "params"), employeeController.remove);

export default router;
