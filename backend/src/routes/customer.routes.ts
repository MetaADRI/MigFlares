import { Router } from "express";
import * as customerController from "../controllers/customer.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  customerCreateSchema,
  customerQuerySchema,
  customerUpdateSchema,
} from "../validation/customer.validation.js";
import { idParamsSchema } from "../validation/common.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/", validate(customerQuerySchema, "query"), customerController.list);
router.post("/", validate(customerCreateSchema), customerController.create);
router.get("/:id", validate(idParamsSchema, "params"), customerController.get);
router.patch("/:id", validate(idParamsSchema, "params"), validate(customerUpdateSchema), customerController.update);
router.delete("/:id", validate(idParamsSchema, "params"), customerController.remove);

export default router;
