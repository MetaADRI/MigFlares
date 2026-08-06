import type { Vehicle, VehicleType } from "@/types";
import type { ListParams, Paginated } from "@/types/api";
import { api } from "@/services/api";

export interface VehicleInput {
  plateNumber: string;
  make: string;
  model: string;
  year: number | null;
  color: string;
  vehicleType: VehicleType;
  customerId: string;
}

export const vehiclesService = {
  async list(params: ListParams = {}): Promise<Paginated<Vehicle>> {
    const { data } = await api.get<Paginated<Vehicle>>("/vehicles", { params });
    return data;
  },

  async listByCustomer(customerId: string): Promise<Vehicle[]> {
    const { data } = await api.get<Paginated<Vehicle>>("/vehicles", {
      params: { customerId, pageSize: 1000 },
    });
    return data.data;
  },

  async create(input: VehicleInput): Promise<Vehicle> {
    const { data } = await api.post<Vehicle>("/vehicles", input);
    return data;
  },

  async update(id: string, input: Partial<VehicleInput>): Promise<Vehicle> {
    const { data } = await api.patch<Vehicle>(`/vehicles/${id}`, input);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/vehicles/${id}`);
  },
};
