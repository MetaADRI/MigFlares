import type { Customer } from "@/types";
import type { ListParams, Paginated } from "@/types/api";
import { api } from "@/services/api";

export interface CustomerInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export const customersService = {
  async list(params: ListParams = {}): Promise<Paginated<Customer>> {
    const { data } = await api.get<Paginated<Customer>>("/customers", { params });
    return data;
  },

  /** Unpaginated list for selects & drawers. */
  async listAll(): Promise<Customer[]> {
    const { data } = await api.get<Paginated<Customer>>("/customers", { params: { pageSize: 1000 } });
    return data.data;
  },

  async create(input: CustomerInput): Promise<Customer> {
    const { data } = await api.post<Customer>("/customers", input);
    return data;
  },

  async update(id: string, input: Partial<CustomerInput>): Promise<Customer> {
    const { data } = await api.patch<Customer>(`/customers/${id}`, input);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/customers/${id}`);
  },
};
