import type { InventoryCategory, InventoryItem, InventoryMovement, InventoryStats, MovementType } from "@/types";
import type { ListParams, Paginated } from "@/types/api";
import { api } from "@/services/api";

export interface InventoryItemInput {
  name: string;
  sku: string;
  category: InventoryCategory;
  supplier?: string | null;
  unit?: string;
  costPrice?: number;
  sellingPrice?: number;
  quantityAvailable?: number;
  minimumQuantity?: number;
  maximumQuantity?: number;
  reorderLevel?: number;
  storageLocation?: string | null;
}

export interface StockAdjustInput {
  type: MovementType;
  quantity: number;
  reason?: string;
}

export const inventoryService = {
  async list(params: ListParams = {}): Promise<Paginated<InventoryItem>> {
    const { data } = await api.get<Paginated<InventoryItem>>("/inventory", { params });
    return data;
  },

  async getStats(): Promise<InventoryStats> {
    const { data } = await api.get<InventoryStats>("/inventory/stats");
    return data;
  },

  async create(input: InventoryItemInput): Promise<InventoryItem> {
    const { data } = await api.post<InventoryItem>("/inventory", input);
    return data;
  },

  async update(id: string, input: Partial<InventoryItemInput>): Promise<InventoryItem> {
    const { data } = await api.patch<InventoryItem>(`/inventory/${id}`, input);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/inventory/${id}`);
  },

  async adjust(id: string, input: StockAdjustInput): Promise<InventoryItem> {
    const { data } = await api.patch<InventoryItem>(`/inventory/${id}/adjust`, input);
    return data;
  },

  async movements(itemId: string): Promise<InventoryMovement[]> {
    const { data } = await api.get<InventoryMovement[]>(`/inventory/${itemId}/movements`);
    return data;
  },
};
