import { z } from "zod";
import { paginationQuerySchema } from "./common.validation.js";

const expenseCategories = [
  "RENT",
  "ELECTRICITY",
  "WATER",
  "INTERNET",
  "FUEL",
  "EQUIPMENT",
  "CLEANING_CHEMICALS",
  "REPAIRS",
  "STAFF_SALARIES",
  "MARKETING",
  "MISC",
] as const;

const paymentMethods = ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER"] as const;

export const expenseCreateSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  category: z.enum(expenseCategories),
  vendor: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  receiptUrl: z.string().trim().max(500).optional().or(z.literal("")),
  paymentMethod: z.enum(paymentMethods),
  expenseDate: z.coerce.date(),
  employeeId: z.string().uuid().optional().nullable(),
});

export const expenseUpdateSchema = expenseCreateSchema.partial();

export const expenseQuerySchema = paginationQuerySchema.extend({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM").optional(),
  category: z.enum(expenseCategories).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  sortBy: z.enum(["amount", "expenseDate", "createdAt"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});
