import { z } from "zod";
import { paginationQuerySchema } from "./common.validation.js";

export const attendanceQuerySchema = paginationQuerySchema.extend({
  status: z.string().max(20).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD").optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD").optional(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be YYYY-MM").optional(),
  employeeId: z.string().uuid("Invalid employee id").optional(),
});

export const attendanceCorrectionSchema = z.object({
  status: z.enum(["PRESENT", "ABSENT", "LATE", "ON_LEAVE", "HOLIDAY"]).optional(),
  clockInAt: z.coerce.date().optional().nullable(),
  clockOutAt: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export const attendanceMarkSchema = z.object({
  employeeId: z.string().uuid("Invalid employee id"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD").optional(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "ON_LEAVE", "HOLIDAY"]),
  clockInAt: z.coerce.date().optional().nullable(),
  clockOutAt: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});
