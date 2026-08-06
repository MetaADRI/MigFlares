import type { Employee, EmployeeStats } from "@/types";
import type { ListParams, Paginated } from "@/types/api";
import { api } from "@/services/api";

export interface EmergencyContactInput {
  name: string;
  phone: string;
  relation: string;
}

export interface EmployeeInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  avatarUrl?: string | null;
  nrcNumber?: string | null;
  position: string;
  hireDate?: string;
  salary?: number | null;
  emergencyContact?: EmergencyContactInput | null;
  notes?: string | null;
}

export const employeesService = {
  async list(params: ListParams = {}): Promise<Paginated<Employee>> {
    const { data } = await api.get<Paginated<Employee>>("/employees", { params });
    return data;
  },

  async getById(id: string): Promise<Employee | null> {
    const { data } = await api.get<Employee>(`/employees/${id}`);
    return data;
  },

  async getStats(id: string): Promise<EmployeeStats> {
    const { data } = await api.get<EmployeeStats>(`/employees/${id}/stats`);
    return data;
  },

  async create(input: EmployeeInput): Promise<Employee> {
    const { data } = await api.post<Employee>("/employees", input);
    return data;
  },

  async update(id: string, input: Partial<EmployeeInput>): Promise<Employee> {
    const { data } = await api.patch<Employee>(`/employees/${id}`, input);
    return data;
  },

  async suspend(id: string, isActive: boolean): Promise<Employee> {
    const { data } = await api.patch<Employee>(`/employees/${id}/suspend`, { isActive });
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/employees/${id}`);
  },
};
