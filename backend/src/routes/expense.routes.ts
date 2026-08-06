import { Router } from "express";
import * as expenseController from "../controllers/expense.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { idParamsSchema } from "../validation/common.validation.js";
import {
  expenseCreateSchema,
  expenseQuerySchema,
  expenseUpdateSchema,
} from "../validation/expense.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/stats", expenseController.stats);
router.get("/export", expenseController.exportCsv);
router.get("/", validate(expenseQuerySchema, "query"), expenseController.list);
router.post("/", validate(expenseCreateSchema), expenseController.create);
router.get("/:id", validate(idParamsSchema, "params"), expenseController.get);
router.patch("/:id", validate(idParamsSchema, "params"), validate(expenseUpdateSchema), expenseController.update);
router.patch("/:id/approve", validate(idParamsSchema, "params"), expenseController.approve);
router.patch("/:id/reject", validate(idParamsSchema, "params"), expenseController.reject);
router.delete("/:id", validate(idParamsSchema, "params"), expenseController.remove);

export default router;
