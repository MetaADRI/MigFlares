import { z } from "zod";
import { paginationQuerySchema } from "./common.validation.js";

const washStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const paymentMethods = ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER"] as const;

export const washCreateSchema = z.object({
  customerId: z.string().uuid("Customer is required"),
  vehicleId: z.string().uuid("Vehicle is required"),
  serviceId: z.string().uuid("Service is required"),
  extras: z
    .array(z.object({ id: z.string().max(50), name: z.string().max(80), price: z.coerce.number().min(0) }))
    .default([]),
  discount: z.coerce.number().min(0).max(100_000).default(0),
  paymentMethod: z.enum(paymentMethods),
  employeeId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  status: z.enum(washStatuses).default("PENDING"),
  beforePhotos: z.array(z.string().max(500)).default([]),
  afterPhotos: z.array(z.string().max(500)).default([]),
});

export const washStatusSchema = z.object({
  status: z.enum(washStatuses),
});

export const washQuerySchema = paginationQuerySchema.extend({
  status: z.enum(washStatuses).optional(),
  customerId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
});
