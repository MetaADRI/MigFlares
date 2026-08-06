import type { AttendanceRecord, AttendanceTodaySummary } from "@/types";
import type { ListParams, Paginated } from "@/types/api";
import { api } from "@/services/api";

export interface AttendanceCorrectionInput {
  status?: string;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  notes?: string;
}

export interface MarkAttendanceInput {
  employeeId: string;
  date?: string;
  status: string;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  notes?: string;
}

export const attendanceService = {
  async list(params: ListParams = {}): Promise<Paginated<AttendanceRecord>> {
    const { data } = await api.get<Paginated<AttendanceRecord>>("/attendance", { params });
    return data;
  },

  async getToday(): Promise<AttendanceTodaySummary> {
    const { data } = await api.get<AttendanceTodaySummary>("/attendance/today");
    return data;
  },

  async mark(input: MarkAttendanceInput): Promise<AttendanceRecord> {
    const { data } = await api.post<AttendanceRecord>("/attendance", input);
    return data;
  },

  async correct(id: string, input: AttendanceCorrectionInput): Promise<AttendanceRecord> {
    const { data } = await api.patch<AttendanceRecord>(`/attendance/${id}`, input);
    return data;
  },
};
