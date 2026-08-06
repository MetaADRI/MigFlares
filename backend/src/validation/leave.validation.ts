import { z } from "zod";
import { paginationQuerySchema } from "./common.validation.js";

export const employeeIdParamsSchema = z.object({
  employeeId: z.string().uuid("Invalid employee id"),
});

export const leaveQuerySchema = paginationQuerySchema.extend({
  status: z.string().max(20).optional(),
  type: z.string().max(20).optional(),
});

export const leaveCreateSchema = z.object({
  type: z.enum(["ANNUAL", "SICK", "UNPAID", "OTHER"]).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  days: z.coerce.number().min(0.5).optional(),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const leaveReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().max(500).optional().or(z.literal("")),
});

export const leaveIdParamsSchema = z.object({
  id: z.string().uuid("Invalid leave id"),
});
