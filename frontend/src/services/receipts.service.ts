import type { Receipt } from "@/types";
import type { ListParams, Paginated } from "@/types/api";
import { api } from "@/services/api";

export const receiptsService = {
  async list(params: ListParams = {}): Promise<Paginated<Receipt>> {
    const { data } = await api.get<Paginated<Receipt>>("/receipts", { params });
    return data;
  },

  async getById(id: string): Promise<Receipt | null> {
    const { data } = await api.get<Receipt>(`/receipts/${id}`);
    return data;
  },

  async void(id: string, reason: string): Promise<Receipt> {
    const { data } = await api.post<Receipt>(`/receipts/${id}/void`, { reason });
    return data;
  },

  async duplicate(id: string): Promise<Receipt> {
    const { data } = await api.post<Receipt>(`/receipts/${id}/duplicate`);
    return data;
  },
};
