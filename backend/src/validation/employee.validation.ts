import { z } from "zod";
import { paginationQuerySchema } from "./common.validation.js";

export const employeeCreateSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required").max(60),
  lastName: z.string().trim().min(2, "Last name is required").max(60),
  phone: z.string().trim().min(6, "Phone is required").max(20),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  avatarUrl: z.string().trim().max(500).optional().or(z.literal("")),
  nrcNumber: z.string().trim().max(20).optional().or(z.literal("")),
  position: z.string().trim().min(2, "Position is required").max(80),
  hireDate: z.coerce.date().optional(),
  salary: z.coerce.number().min(0).optional().nullable(),
  emergencyContact: z
    .object({
      name: z.string().max(80).optional().or(z.literal("")),
      phone: z.string().max(20).optional().or(z.literal("")),
      relation: z.string().max(40).optional().or(z.literal("")),
    })
    .optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const employeeUpdateSchema = employeeCreateSchema.partial();

export const employeeSuspendSchema = z.object({
  isActive: z.boolean(),
});

export const employeeQuerySchema = paginationQuerySchema.extend({
  position: z.string().max(80).optional(),
  status: z.enum(["active", "suspended"]).optional(),
  sortBy: z.enum(["name", "position", "hireDate", "salary", "createdAt"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});
