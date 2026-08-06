import type { Booking, BookingStatus } from "@/types";
import type { ListParams, Paginated } from "@/types/api";
import { api } from "@/services/api";

export interface BookingInput {
  customerId: string;
  vehicleId: string;
  serviceId: string;
  employeeId?: string | null;
  scheduledAt: string;
  durationMin: number;
  notes?: string | null;
  status: BookingStatus;
}

export const bookingsService = {
  async list(params: ListParams = {}): Promise<Paginated<Booking>> {
    const { data } = await api.get<Paginated<Booking>>("/bookings", { params });
    return data;
  },

  async create(input: BookingInput): Promise<Booking> {
    const { data } = await api.post<Booking>("/bookings", input);
    return data;
  },

  async update(id: string, input: Partial<BookingInput>): Promise<Booking> {
    const { data } = await api.patch<Booking>(`/bookings/${id}`, input);
    return data;
  },

  async updateStatus(id: string, status: BookingStatus): Promise<Booking> {
    const { data } = await api.patch<Booking>(`/bookings/${id}/status`, { status });
    return data;
  },

  async getById(id: string): Promise<Booking | null> {
    const { data } = await api.get<Booking>(`/bookings/${id}`);
    return data;
  },
};
