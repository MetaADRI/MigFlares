import type { Request, Response } from "express";
import { created, ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as receiptService from "../services/receipt.service.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await receiptService.listReceipts(
    req.query as unknown as receiptService.ReceiptListQuery,
    req.user?.branchId ?? null,
  );
  res.json(ok(result));
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const receipt = await receiptService.getReceiptById(String(req.params.id));
  res.json(ok(receipt));
});

export const voidReceipt = asyncHandler(async (req: Request, res: Response) => {
  const receipt = await receiptService.voidReceipt(String(req.params.id), req.body.reason, req.user!.sub);
  res.json(ok(receipt, "Receipt voided"));
});

export const duplicate = asyncHandler(async (req: Request, res: Response) => {
  const receipt = await receiptService.duplicateReceipt(String(req.params.id), req.user!.sub);
  res.status(201).json(created(receipt, "Receipt duplicated"));
});
