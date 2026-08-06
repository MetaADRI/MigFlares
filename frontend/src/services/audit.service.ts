import type { AuditLog } from "@/types";
import type { ListParams, Paginated } from "@/types/api";
import { api } from "@/services/api";

export interface AuditListParams extends ListParams {
  action?: string;
  entity?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const auditService = {
  async list(params: AuditListParams = {}): Promise<Paginated<AuditLog>> {
    const { data } = await api.get<Paginated<AuditLog>>("/audit-logs", { params });
    return data;
  },

  async actionTypes(): Promise<string[]> {
    const { data } = await api.get<string[]>("/audit-logs/actions");
    return data;
  },

  async entities(): Promise<string[]> {
    const { data } = await api.get<string[]>("/audit-logs/entities");
    return data;
  },
};
