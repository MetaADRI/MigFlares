import type { AnalyticsOverview } from "@/types";
import { api } from "@/services/api";

export const analyticsService = {
  async getOverview(): Promise<AnalyticsOverview> {
    const { data } = await api.get<AnalyticsOverview>("/analytics/overview");
    return data;
  },
};
