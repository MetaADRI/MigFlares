import { z } from "zod";

export const idParamsSchema = z.object({
  id: z.string().uuid("Invalid id"),
});

export const customerIdParamsSchema = z.object({
  customerId: z.string().uuid("Invalid customer id"),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(1000).optional(),
  search: z.string().trim().max(100).optional(),
});
