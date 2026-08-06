import { Router } from "express";
import * as receiptController from "../controllers/receipt.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { idParamsSchema } from "../validation/common.validation.js";
import { receiptQuerySchema, voidReceiptSchema } from "../validation/receipt.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/", validate(receiptQuerySchema, "query"), receiptController.list);
router.get("/:id", validate(idParamsSchema, "params"), receiptController.get);
router.post("/:id/void", validate(idParamsSchema, "params"), validate(voidReceiptSchema), receiptController.voidReceipt);
router.post("/:id/duplicate", validate(idParamsSchema, "params"), receiptController.duplicate);

export default router;
