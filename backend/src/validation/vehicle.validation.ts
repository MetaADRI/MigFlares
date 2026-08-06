import { z } from "zod";
import { paginationQuerySchema } from "./common.validation.js";

const vehicleTypes = ["SEDAN", "SUV", "HATCHBACK", "TRUCK", "VAN", "MOTORCYCLE", "BUS", "OTHER"] as const;

export const vehicleCreateSchema = z.object({
  plateNumber: z.string().trim().min(3, "Plate number is required").max(12).transform((v) => v.toUpperCase()),
  make: z.string().trim().min(2, "Make is required").max(50),
  model: z.string().trim().min(1, "Model is required").max(50),
  year: z.coerce.number().int().min(1980).max(2100).optional().nullable(),
  color: z.string().trim().min(2, "Colour is required").max(30),
  vehicleType: z.enum(vehicleTypes).default("SEDAN"),
  customerId: z.string().uuid("Customer id is invalid"),
});

export const vehicleUpdateSchema = vehicleCreateSchema.partial();

export const vehicleQuerySchema = paginationQuerySchema.extend({
  vehicleType: z.enum(vehicleTypes).optional(),
  status: z.enum(["ACTIVE", "IN_SERVICE", "RETIRED"]).optional(),
  customerId: z.string().uuid().optional(),
});
