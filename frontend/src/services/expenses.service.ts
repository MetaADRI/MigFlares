import type { Expense, ExpenseCategory, ExpenseStats, PaymentMethod } from "@/types";
import type { ListParams, Paginated } from "@/types/api";
import { api } from "@/services/api";

export interface ExpenseInput {
  amount: number;
  category: ExpenseCategory;
  vendor?: string | null;
  description?: string | null;
  receiptUrl?: string | null;
  paymentMethod: PaymentMethod;
  expenseDate?: string;
  employeeId?: string | null;
}

export const expensesService = {
  async list(params: ListParams = {}): Promise<Paginated<Expense>> {
    const { data } = await api.get<Paginated<Expense>>("/expenses", { params });
    return data;
  },

  async getStats(): Promise<ExpenseStats> {
    const { data } = await api.get<ExpenseStats>("/expenses/stats");
    return data;
  },

  async create(input: ExpenseInput): Promise<Expense> {
    const { data } = await api.post<Expense>("/expenses", input);
    return data;
  },

  async update(id: string, input: Partial<ExpenseInput>): Promise<Expense> {
    const { data } = await api.patch<Expense>(`/expenses/${id}`, input);
    return data;
  },

  async setStatus(id: string, status: Expense["status"]): Promise<Expense> {
    const action = status === "APPROVED" ? "approve" : "reject";
    const { data } = await api.patch<Expense>(`/expenses/${id}/${action}`);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/expenses/${id}`);
  },

  /** All rows matching filters — used to build the CSV export. */
  async exportAll(params: ListParams = {}): Promise<Expense[]> {
    const { data } = await api.get<Expense[]>("/expenses/export", { params });
    return data;
  },
};
