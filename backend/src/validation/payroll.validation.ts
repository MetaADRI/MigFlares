import { z } from "zod";
import { paginationQuerySchema } from "./common.validation.js";

export const payrollRuleSchema = z.object({
  name: z.string().trim().max(80).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "startTime must be HH:mm").optional(),
  graceMinutes: z.coerce.number().int().min(0).max(240).optional(),
  standardMinutesPerDay: z.coerce.number().int().min(60).max(720).optional(),
  overtimeRate: z.coerce.number().min(1).max(4).optional(),
  dailyOvertimeThresholdMin: z.coerce.number().int().min(240).max(1440).optional(),
  defaultPayday: z.coerce.number().int().min(1).max(28).optional(),
  bonusEnabled: z.boolean().optional(),
  overtimeEnabled: z.boolean().optional(),
  allowancesEnabled: z.boolean().optional(),
  deductionLoan: z.coerce.number().min(0).optional(),
  deductionDamages: z.coerce.number().min(0).optional(),
  deductionUniform: z.coerce.number().min(0).optional(),
  deductionTransport: z.coerce.number().min(0).optional(),
  deductionMeals: z.coerce.number().min(0).optional(),
  deductionAdvances: z.coerce.number().min(0).optional(),
  deductionOther: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const runQuerySchema = paginationQuerySchema.extend({
  status: z.string().max(20).optional(),
  periodMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "periodMonth must be YYYY-MM").optional(),
});

export const payslipQuerySchema = paginationQuerySchema;

export const generateRunSchema = z.object({
  periodMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "periodMonth must be YYYY-MM"),
});

export const payslipAdjustSchema = z.object({
  overtimeHours: z.coerce.number().min(0).optional(),
  overtimeAmount: z.coerce.number().min(0).optional(),
  bonusAmount: z.coerce.number().min(0).optional(),
  allowancesAmount: z.coerce.number().min(0).optional(),
  deductionLoan: z.coerce.number().min(0).optional(),
  deductionDamages: z.coerce.number().min(0).optional(),
  deductionUniform: z.coerce.number().min(0).optional(),
  deductionTransport: z.coerce.number().min(0).optional(),
  deductionMeals: z.coerce.number().min(0).optional(),
  deductionAdvances: z.coerce.number().min(0).optional(),
  deductionOther: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export const markPaidSchema = z.object({
  paymentMethod: z.enum(["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER"]),
});
