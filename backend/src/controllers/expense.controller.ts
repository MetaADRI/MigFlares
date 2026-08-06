import type { Request, Response } from "express";
import { created, ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as expenseService from "../services/expense.service.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await expenseService.listExpenses(
    req.query as unknown as expenseService.ExpenseListQuery,
    req.user?.branchId ?? null,
  );
  res.json(ok(result));
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const expense = await expenseService.getExpense(String(req.params.id));
  res.json(ok(expense));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const expense = await expenseService.createExpense(req.body, req.user!.sub, req.user?.branchId ?? null);
  res.status(201).json(created(expense, "Expense recorded"));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const expense = await expenseService.updateExpense(String(req.params.id), req.body);
  res.json(ok(expense, "Expense updated"));
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  const expense = await expenseService.setExpenseStatus(String(req.params.id), "APPROVED", req.user!.sub);
  res.json(ok(expense, "Expense approved"));
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  const expense = await expenseService.setExpenseStatus(String(req.params.id), "REJECTED", req.user!.sub);
  res.json(ok(expense, "Expense rejected"));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await expenseService.deleteExpense(String(req.params.id));
  res.json(ok(null, "Expense deleted"));
});

export const stats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await expenseService.getStats(req.user?.branchId ?? null);
  res.json(ok(stats));
});

export const exportCsv = asyncHandler(async (req: Request, res: Response) => {
  const rows = await expenseService.exportExpenses(
    req.query as unknown as expenseService.ExpenseListQuery,
    req.user?.branchId ?? null,
  );
  const header = ["Date", "Amount (ZMW)", "Category", "Vendor", "Description", "Payment Method", "Status", "Created By"];
  const lines = rows.map((r) =>
    [
      r.expenseDate.slice(0, 10),
      r.amount,
      r.category,
      `"${(r.vendor ?? "").replace(/"/g, '""')}"`,
      `"${(r.description ?? "").replace(/"/g, '""')}"`,
      r.paymentMethod,
      r.status,
      `"${(r.createdByName ?? "").replace(/"/g, '""')}"`,
    ].join(","),
  );
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="expenses-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send([header.join(","), ...lines].join("\n"));
});
