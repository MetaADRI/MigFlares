import { z } from "zod";
import { paginationQuerySchema } from "./common.validation.js";

export const customerCreateSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required").max(60),
  lastName: z.string().trim().min(2, "Last name is required").max(60),
  phone: z.string().trim().min(6, "Phone is required").max(20),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export const customerQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["ACTIVE", "INACTIVE", "VIP", "BLACKLISTED"]).optional(),
  sortBy: z.enum(["name", "createdAt", "visits", "totalSpent", "lastVisitAt"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});
