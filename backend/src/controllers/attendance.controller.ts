import type { Request, Response } from "express";
import { created, ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as attendanceService from "../services/attendance.service.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await attendanceService.listAttendance(
    req.query as unknown as attendanceService.AttendanceListQuery,
    req.user?.branchId ?? null,
  );
  res.json(ok(result));
});

export const mark = asyncHandler(async (req: Request, res: Response) => {
  const record = await attendanceService.markAttendanceManual(
    { ...req.body, branchId: req.user?.branchId ?? null },
    req.user?.sub,
  );
  res.status(201).json(created(record, "Attendance marked"));
});

export const today = asyncHandler(async (req: Request, res: Response) => {
  const summary = await attendanceService.getTodaySummary(req.user?.branchId ?? null);
  res.json(ok(summary));
});

export const correct = asyncHandler(async (req: Request, res: Response) => {
  const record = await attendanceService.correctAttendance(
    String(req.params.id),
    req.body,
    req.user?.sub,
  );
  res.json(ok(record, "Attendance updated"));
});
