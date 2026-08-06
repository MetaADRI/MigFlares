import { Router } from "express";
import * as vehicleController from "../controllers/vehicle.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { idParamsSchema } from "../validation/common.validation.js";
import {
  vehicleCreateSchema,
  vehicleQuerySchema,
  vehicleUpdateSchema,
} from "../validation/vehicle.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/", validate(vehicleQuerySchema, "query"), vehicleController.list);
router.post("/", validate(vehicleCreateSchema), vehicleController.create);
router.get("/:id", validate(idParamsSchema, "params"), vehicleController.get);
router.patch("/:id", validate(idParamsSchema, "params"), validate(vehicleUpdateSchema), vehicleController.update);
router.delete("/:id", validate(idParamsSchema, "params"), vehicleController.remove);

export default router;
