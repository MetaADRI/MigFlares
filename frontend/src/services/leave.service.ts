import type { LeaveBalances, LeaveRequest } from "@/types";
import type { ListParams, Paginated } from "@/types/api";
import { api } from "@/services/api";

export interface LeaveRequestInput {
  type?: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export const leaveService = {
  async list(params: ListParams = {}): Promise<Paginated<LeaveRequest>> {
    const { data } = await api.get<Paginated<LeaveRequest>>("/leave", { params });
    return data;
  },

  async getPendingCount(): Promise<number> {
    const { data } = await api.get<{ count: number }>("/leave/pending-count");
    return data.count;
  },

  async getBalances(employeeId: string): Promise<LeaveBalances> {
    const { data } = await api.get<LeaveBalances>(`/leave/balances/${employeeId}`);
    return data;
  },

  async create(employeeId: string, input: LeaveRequestInput): Promise<LeaveRequest> {
    const { data } = await api.post<LeaveRequest>(`/leave/${employeeId}`, input);
    return data;
  },

  async review(id: string, status: "APPROVED" | "REJECTED", reviewNote?: string): Promise<LeaveRequest> {
    const { data } = await api.patch<LeaveRequest>(`/leave/${id}/review`, { status, reviewNote });
    return data;
  },

  async cancel(id: string): Promise<LeaveRequest> {
    const { data } = await api.post<LeaveRequest>(`/leave/${id}/cancel`, {});
    return data;
  },

  /* Self-service — resolves the employee from the logged-in user. */
  async myList(params: ListParams = {}): Promise<Paginated<LeaveRequest>> {
    const { data } = await api.get<Paginated<LeaveRequest>>("/employees/me/leave", { params });
    return data;
  },

  async myBalances(): Promise<LeaveBalances> {
    const { data } = await api.get<LeaveBalances>("/employees/me/leave/balances");
    return data;
  },

  async myCreate(input: LeaveRequestInput): Promise<LeaveRequest> {
    const { data } = await api.post<LeaveRequest>("/employees/me/leave", input);
    return data;
  },

  async myCancel(id: string): Promise<LeaveRequest> {
    const { data } = await api.post<LeaveRequest>(`/employees/me/leave/${id}/cancel`, {});
    return data;
  },
};
