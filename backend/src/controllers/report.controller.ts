import type { Request, Response } from "express";
import { ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { generateReport, reportToCsv, type ReportQuery } from "../services/report.service.js";

export const generate = asyncHandler(async (req: Request, res: Response) => {
  const report = await generateReport({
    ...(req.query as unknown as Omit<ReportQuery, "branchId">),
    branchId: req.user?.branchId ?? null,
  });
  res.json(ok(report));
});

export const exportCsv = asyncHandler(async (req: Request, res: Response) => {
  const report = await generateReport({
    ...(req.query as unknown as Omit<ReportQuery, "branchId">),
    branchId: req.user?.branchId ?? null,
  });
  const csv = reportToCsv(report);
  res
    .setHeader("Content-Type", "text/csv; charset=utf-8")
    .setHeader("Content-Disposition", `attachment; filename="report-${report.type.toLowerCase()}.csv"`)
    .send(csv);
});
