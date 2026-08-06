import type { Request, Response } from "express";
import { created, ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as inventoryService from "../services/inventory.service.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await inventoryService.listItems(
    req.query as unknown as inventoryService.InventoryListQuery,
    req.user?.branchId ?? null,
  );
  res.json(ok(result));
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const item = await inventoryService.getItem(String(req.params.id));
  res.json(ok(item));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const item = await inventoryService.createItem(req.body, req.user?.branchId ?? null);
  res.status(201).json(created(item, "Inventory item added"));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const item = await inventoryService.updateItem(String(req.params.id), req.body);
  res.json(ok(item, "Inventory item updated"));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await inventoryService.deleteItem(String(req.params.id));
  res.json(ok(null, "Inventory item deleted"));
});

export const adjust = asyncHandler(async (req: Request, res: Response) => {
  const item = await inventoryService.adjustStock(
    String(req.params.id),
    req.body,
    req.user?.sub,
    req.user?.branchId ?? null,
  );
  res.json(ok(item, "Stock adjusted"));
});

export const movements = asyncHandler(async (req: Request, res: Response) => {
  const movements = await inventoryService.listMovements(String(req.params.id));
  res.json(ok(movements));
});

export const stats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await inventoryService.getStats(req.user?.branchId ?? null);
  res.json(ok(stats));
});
