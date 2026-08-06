import { Router } from "express";
import * as bookingController from "../controllers/booking.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { customerIdParamsSchema, idParamsSchema } from "../validation/common.validation.js";
import {
  bookingCreateSchema,
  bookingQuerySchema,
  bookingStatusSchema,
  bookingUpdateSchema,
} from "../validation/booking.validation.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  requirePermission("bookings:view", "bookings:manage"),
  validate(bookingQuerySchema, "query"),
  bookingController.list,
);
router.post(
  "/",
  requirePermission("bookings:manage"),
  validate(bookingCreateSchema),
  bookingController.create,
);
router.get(
  "/customer/:customerId",
  requirePermission("bookings:view", "bookings:manage"),
  validate(customerIdParamsSchema, "params"),
  bookingController.customerHistory,
);
router.get(
  "/:id",
  requirePermission("bookings:view", "bookings:manage"),
  validate(idParamsSchema, "params"),
  bookingController.get,
);
router.patch(
  "/:id",
  requirePermission("bookings:manage"),
  validate(idParamsSchema, "params"),
  validate(bookingUpdateSchema),
  bookingController.update,
);
router.patch(
  "/:id/status",
  requirePermission("bookings:manage"),
  validate(idParamsSchema, "params"),
  validate(bookingStatusSchema),
  bookingController.updateStatus,
);

export default router;
