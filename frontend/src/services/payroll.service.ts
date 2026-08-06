import type { PaydayReminder, PayrollRule, PayrollRun, PayrollSummary, Payslip } from "@/types";
import type { ListParams, Paginated } from "@/types/api";
import { api } from "@/services/api";

export interface PayrollRuleInput {
  name?: string;
  startTime?: string;
  graceMinutes?: number;
  standardMinutesPerDay?: number;
  overtimeRate?: number;
  dailyOvertimeThresholdMin?: number;
  defaultPayday?: number;
  bonusEnabled?: boolean;
  overtimeEnabled?: boolean;
  allowancesEnabled?: boolean;
  deductionLoan?: number;
  deductionDamages?: number;
  deductionUniform?: number;
  deductionTransport?: number;
  deductionMeals?: number;
  deductionAdvances?: number;
  deductionOther?: number;
  notes?: string;
}

export interface PayslipAdjustInput {
  overtimeHours?: number;
  overtimeAmount?: number;
  bonusAmount?: number;
  allowancesAmount?: number;
  deductionLoan?: number;
  deductionDamages?: number;
  deductionUniform?: number;
  deductionTransport?: number;
  deductionMeals?: number;
  deductionAdvances?: number;
  deductionOther?: number;
  notes?: string;
}

export const payrollService = {
  async getRule(): Promise<PayrollRule> {
    const { data } = await api.get<PayrollRule>("/payroll/rule");
    return data;
  },

  async updateRule(input: PayrollRuleInput): Promise<PayrollRule> {
    const { data } = await api.put<PayrollRule>("/payroll/rule", input);
    return data;
  },

  async listRuns(params: ListParams = {}): Promise<Paginated<PayrollRun>> {
    const { data } = await api.get<Paginated<PayrollRun>>("/payroll/runs", { params });
    return data;
  },

  async getRun(id: string): Promise<PayrollRun> {
    const { data } = await api.get<PayrollRun>(`/payroll/runs/${id}`);
    return data;
  },

  async generate(periodMonth: string): Promise<PayrollRun> {
    const { data } = await api.post<PayrollRun>("/payroll/runs", { periodMonth });
    return data;
  },

  async processRun(id: string): Promise<PayrollRun> {
    const { data } = await api.post<PayrollRun>(`/payroll/runs/${id}/process`, {});
    return data;
  },

  async markRunPaid(id: string, paymentMethod: string): Promise<PayrollRun> {
    const { data } = await api.post<PayrollRun>(`/payroll/runs/${id}/paid`, { paymentMethod });
    return data;
  },

  async markPayslipPaid(id: string, paymentMethod: string): Promise<PayrollRun> {
    const { data } = await api.post<PayrollRun>(`/payroll/payslips/${id}/paid`, { paymentMethod });
    return data;
  },

  async adjustPayslip(id: string, input: PayslipAdjustInput): Promise<Payslip> {
    const { data } = await api.patch<Payslip>(`/payroll/payslips/${id}`, input);
    return data;
  },

  async getPaydayReminders(): Promise<PaydayReminder> {
    const { data } = await api.get<PaydayReminder>("/payroll/payday");
    return data;
  },

  /* Self-service — resolves the employee from the logged-in user. */
  async myPayslips(params: ListParams = {}): Promise<Paginated<Payslip>> {
    const { data } = await api.get<Paginated<Payslip>>("/employees/me/payslips", { params });
    return data;
  },

  async mySummary(): Promise<PayrollSummary> {
    const { data } = await api.get<PayrollSummary>("/employees/me/payroll");
    return data;
  },
};
