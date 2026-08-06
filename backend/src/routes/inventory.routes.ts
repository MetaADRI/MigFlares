import { Router } from "express";
import * as inventoryController from "../controllers/inventory.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { idParamsSchema } from "../validation/common.validation.js";
import {
  inventoryCreateSchema,
  inventoryQuerySchema,
  inventoryUpdateSchema,
  stockAdjustSchema,
} from "../validation/inventory.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/stats", inventoryController.stats);
router.get("/", validate(inventoryQuerySchema, "query"), inventoryController.list);
router.post("/", validate(inventoryCreateSchema), inventoryController.create);
router.get("/:id", validate(idParamsSchema, "params"), inventoryController.get);
router.get("/:id/movements", validate(idParamsSchema, "params"), inventoryController.movements);
router.patch("/:id", validate(idParamsSchema, "params"), validate(inventoryUpdateSchema), inventoryController.update);
router.patch("/:id/adjust", validate(idParamsSchema, "params"), validate(stockAdjustSchema), inventoryController.adjust);
router.delete("/:id", validate(idParamsSchema, "params"), inventoryController.remove);

export default router;
