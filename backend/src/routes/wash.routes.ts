import { Router } from "express";
import * as washController from "../controllers/wash.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { customerIdParamsSchema, idParamsSchema } from "../validation/common.validation.js";
import { washCreateSchema, washQuerySchema, washStatusSchema } from "../validation/wash.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/", validate(washQuerySchema, "query"), washController.list);
router.post("/", validate(washCreateSchema), washController.create);
router.get("/customer/:customerId", validate(customerIdParamsSchema, "params"), washController.customerHistory);
router.get("/:id", validate(idParamsSchema, "params"), washController.get);
router.get("/:id/receipt", validate(idParamsSchema, "params"), washController.getReceipt);
router.patch("/:id/status", validate(idParamsSchema, "params"), validate(washStatusSchema), washController.updateStatus);

export default router;
