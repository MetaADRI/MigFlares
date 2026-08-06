import type { Service, ServiceCategory } from "@/types";
import type { ListParams, Paginated } from "@/types/api";
import { api } from "@/services/api";

export interface ServiceRequirementInput {
  inventoryItemId: string;
  quantity: number;
}

export interface ServiceInput {
  name: string;
  description?: string | null;
  price: number;
  durationMin?: number | null;
  category: ServiceCategory;
  icon?: string | null;
  colour?: string;
  displayOrder?: number;
  isActive?: boolean;
  inventoryRequired: ServiceRequirementInput[];
}

export const servicesService = {
  async list(params: ListParams = {}): Promise<Paginated<Service>> {
    const { data } = await api.get<Paginated<Service>>("/services", { params });
    return data;
  },

  async create(input: ServiceInput): Promise<Service> {
    const { data } = await api.post<Service>("/services", input);
    return data;
  },

  async update(id: string, input: Partial<ServiceInput>): Promise<Service> {
    const { data } = await api.patch<Service>(`/services/${id}`, input);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/services/${id}`);
  },

  async duplicate(id: string): Promise<Service> {
    const { data } = await api.post<Service>(`/services/${id}/duplicate`);
    return data;
  },

  async toggle(id: string, isActive: boolean): Promise<Service> {
    const { data } = await api.patch<Service>(`/services/${id}/toggle`, { isActive });
    return data;
  },
};
