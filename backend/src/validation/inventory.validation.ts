import { z } from "zod";
import { paginationQuerySchema } from "./common.validation.js";

const inventoryCategories = [
  "CLEANING_CHEMICALS",
  "EQUIPMENT",
  "CONSUMABLES",
  "SUPPLIES",
  "OTHER",
] as const;

export const inventoryCreateSchema = z.object({
  name: z.string().trim().min(2, "Product name is required").max(80),
  sku: z.string().trim().min(2, "SKU is required").max(40).transform((v) => v.toUpperCase()),
  category: z.enum(inventoryCategories).default("CLEANING_CHEMICALS"),
  supplier: z.string().trim().max(80).optional().or(z.literal("")),
  unit: z.string().trim().max(20).default("unit"),
  costPrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  quantityAvailable: z.coerce.number().min(0).default(0),
  minimumQuantity: z.coerce.number().min(0).default(0),
  maximumQuantity: z.coerce.number().min(0).default(0),
  reorderLevel: z.coerce.number().min(0).default(0),
  storageLocation: z.string().trim().max(60).optional().or(z.literal("")),
});

export const inventoryUpdateSchema = inventoryCreateSchema.partial();

export const inventoryQuerySchema = paginationQuerySchema.extend({
  category: z.enum(inventoryCategories).optional(),
  stock: z.enum(["all", "low", "out"]).optional(),
  sortBy: z.enum(["name", "quantityAvailable", "costPrice", "createdAt"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export const stockAdjustSchema = z.object({
  type: z.enum(["RESTOCK", "ISSUE", "ADJUSTMENT", "WRITE_OFF"]),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  reason: z.string().trim().max(300).optional().or(z.literal("")),
});
