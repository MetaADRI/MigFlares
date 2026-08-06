import type { Request, Response } from "express";
import { ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { listActionTypes, listAuditLogs } from "../services/audit.service.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listAuditLogs(
    req.query as unknown as Parameters<typeof listAuditLogs>[0],
    req.user?.branchId ?? null,
  );
  res.json(ok(result));
});

export const actions = asyncHandler(async (_req: Request, res: Response) => {
  res.json(ok(await listActionTypes()));
});
