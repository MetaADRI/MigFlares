import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters").max(50),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});
