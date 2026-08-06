import { z } from "zod";
import { paginationQuerySchema } from "./common.validation.js";

export const bookingStatuses = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

export const bookingCreateSchema = z.object({
  customerId: z.string().uuid("Customer is required"),
  vehicleId: z.string().uuid("Vehicle is required"),
  serviceId: z.string().uuid("Service is required"),
  employeeId: z.string().uuid().optional().nullable(),
  scheduledAt: z.coerce.date("A valid date and time is required"),
  durationMin: z.coerce.number().int().min(10).max(480).default(30),
  notes: z.string().trim().max(500).optional().nullable(),
  status: z.enum(bookingStatuses).default("PENDING"),
});

export const bookingUpdateSchema = bookingCreateSchema
  .omit({ status: true })
  .partial();

export const bookingStatusSchema = z.object({
  status: z.enum(bookingStatuses),
});

export const bookingQuerySchema = paginationQuerySchema.extend({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.enum(bookingStatuses).optional(),
  customerId: z.string().uuid().optional(),
});
