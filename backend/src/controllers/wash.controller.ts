import type { Request, Response } from "express";
import { created, ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as washService from "../services/wash.service.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await washService.listWashJobs(
    req.query as unknown as washService.WashListQuery,
    req.user?.branchId ?? null,
  );
  res.json(ok(result));
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const job = await washService.getWashJob(String(req.params.id));
  res.json(ok(job));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const job = await washService.createWashJob(req.body, req.user!.sub, req.user?.branchId ?? null);
  res.status(201).json(created(job, "Wash job created"));
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const result = await washService.updateWashJobStatus(
    String(req.params.id),
    req.body.status,
    req.user!.sub,
  );
  res.json(ok(result, "Wash job updated"));
});

export const getReceipt = asyncHandler(async (req: Request, res: Response) => {
  const receipt = await washService.getReceipt(String(req.params.id));
  res.json(ok(receipt));
});

export const customerHistory = asyncHandler(async (req: Request, res: Response) => {
  const jobs = await washService.listWashJobsByCustomer(String(req.params.customerId));
  res.json(ok(jobs));
});
