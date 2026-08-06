import { z } from "zod";
import { paginationQuerySchema } from "./common.validation.js";

const serviceCategories = ["EXTERIOR", "INTERIOR", "FULL", "DETAILING", "OTHER"] as const;

export const inventoryRequirementSchema = z.object({
  inventoryItemId: z.string().uuid("Invalid inventory item"),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
});

export const serviceCreateSchema = z.object({
  name: z.string().trim().min(2, "Service name is required").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  price: z.coerce.number().min(0, "Price can't be negative"),
  durationMin: z.coerce.number().int().min(1).optional().nullable(),
  category: z.enum(serviceCategories).default("EXTERIOR"),
  icon: z.string().trim().max(50).optional().or(z.literal("")),
  colour: z.string().trim().max(20).optional().or(z.literal("")),
  displayOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  inventoryRequired: z.array(inventoryRequirementSchema).default([]),
});

export const serviceUpdateSchema = serviceCreateSchema.partial();

export const serviceQuerySchema = paginationQuerySchema.extend({
  category: z.enum(serviceCategories).optional(),
  active: z.enum(["true", "false"]).optional(),
  sortBy: z.enum(["name", "price", "displayOrder", "createdAt"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});
