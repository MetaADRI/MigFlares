import type { Request, Response } from "express";
import { created, ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as customerService from "../services/customer.service.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await customerService.listCustomers(
    req.query as unknown as customerService.CustomerListQuery,
    req.user?.branchId ?? null,
  );
  res.json(ok(result));
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customerService.getCustomer(String(req.params.id));
  res.json(ok(customer));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customerService.createCustomer(req.body, req.user?.branchId ?? null);
  res.status(201).json(created(customer, "Customer created"));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customerService.updateCustomer(String(req.params.id), req.body);
  res.json(ok(customer, "Customer updated"));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await customerService.deleteCustomer(String(req.params.id));
  res.json(ok(null, "Customer deleted"));
});
