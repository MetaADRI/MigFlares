import { z } from "zod";

/** Admin-created accounts — owner/manager can provision staff logins. */
export const createUserSchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters").max(50),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
  roleId: z.string().min(1, "Role is required"),
});

export const updateUserSchema = z.object({
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  fullName: z.string().trim().min(2, "Full name is required").max(100).optional(),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  roleId: z.string().min(1, "Role is required").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").max(128).optional(),
});
