import type { ActivityItem, Customer, DashboardInsights, DashboardStats, RevenuePoint, TopService } from "@/types";
import { api } from "@/services/api";

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const { data } = await api.get<DashboardStats>("/dashboard/stats");
    return data;
  },

  async getRevenueSeries(period: "week" | "month"): Promise<RevenuePoint[]> {
    const { data } = await api.get<RevenuePoint[]>("/dashboard/revenue", { params: { period } });
    return data;
  },

  async getActivities(): Promise<ActivityItem[]> {
    const { data } = await api.get<ActivityItem[]>("/dashboard/activities");
    return data;
  },

  async getTopServices(): Promise<TopService[]> {
    const { data } = await api.get<TopService[]>("/dashboard/top-services");
    return data;
  },

  async getRecentCustomers(): Promise<Customer[]> {
    const { data } = await api.get<Customer[]>("/dashboard/recent-customers");
    return data;
  },

  async getInsights(): Promise<DashboardInsights> {
    const { data } = await api.get<DashboardInsights>("/dashboard/insights");
    return data;
  },
};
