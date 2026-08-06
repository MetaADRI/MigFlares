import { z } from "zod";
import { paginationQuerySchema } from "./common.validation.js";

export const receiptQuerySchema = paginationQuerySchema.extend({
  customerId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  status: z.enum(["PAID", "PARTIAL", "REFUNDED", "VOIDED"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const voidReceiptSchema = z.object({
  reason: z.string().trim().min(3, "A void reason is required").max(300),
});
