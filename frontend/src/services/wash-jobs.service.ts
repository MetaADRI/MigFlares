import type { Customer, Employee, PaymentMethod, Receipt, Service, Vehicle, WashJob, WashStatus } from "@/types";
import type { ListParams, Paginated } from "@/types/api";
import { api } from "@/services/api";

export interface WashJobInput {
  customerId: string;
  vehicleId: string;
  serviceId: string;
  extras: { id: string; name: string; price: number }[];
  discount: number;
  paymentMethod: PaymentMethod;
  employeeId?: string | null;
  notes?: string | null;
  status: WashStatus;
  beforePhotos: string[];
  afterPhotos: string[];
}

export interface StatusUpdateResult {
  washJob: WashJob;
  receipt: Receipt | null;
}

export const washJobsService = {
  async list(params: ListParams = {}): Promise<Paginated<WashJob>> {
    const { data } = await api.get<Paginated<WashJob>>("/wash-jobs", { params });
    return data;
  },

  async create(input: WashJobInput): Promise<WashJob> {
    const { data } = await api.post<WashJob>("/wash-jobs", input);
    return data;
  },

  async updateStatus(id: string, status: WashStatus): Promise<StatusUpdateResult> {
    const { data } = await api.patch<StatusUpdateResult>(`/wash-jobs/${id}/status`, { status });
    return data;
  },

  async getById(id: string): Promise<WashJob | null> {
    const { data } = await api.get<WashJob>(`/wash-jobs/${id}`);
    return data;
  },

  /** Recent wash history for a customer (drawers & profiles). */
  async listByCustomer(customerId: string): Promise<WashJob[]> {
    const { data } = await api.get<Paginated<WashJob>>("/wash-jobs", {
      params: { customerId, pageSize: 50 },
    });
    return data.data;
  },

  async getReceipt(washJobId: string): Promise<Receipt | null> {
    const { data } = await api.get<Receipt>(`/wash-jobs/${washJobId}/receipt`);
    return data;
  },

  async getServices(): Promise<Service[]> {
    const { data } = await api.get<Paginated<Service>>("/services", {
      params: { pageSize: 1000, active: "true" },
    });
    return data.data;
  },

  async getEmployees(): Promise<Employee[]> {
    const { data } = await api.get<Paginated<Employee>>("/employees", { params: { pageSize: 1000 } });
    return data.data;
  },

  async getCustomers(): Promise<Customer[]> {
    const { data } = await api.get<Paginated<Customer>>("/customers", { params: { pageSize: 1000 } });
    return data.data;
  },

  async getVehiclesByCustomer(customerId: string): Promise<Vehicle[]> {
    const { data } = await api.get<Paginated<Vehicle>>("/vehicles", {
      params: { customerId, pageSize: 1000 },
    });
    return data.data;
  },
};
