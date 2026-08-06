import type { Notification, NotificationListResult, NotificationType } from "@/types";
import type { ListParams } from "@/types/api";
import { api } from "@/services/api";

export interface NotificationListResultWithMeta extends NotificationListResult {
  data: Notification[];
}

export const notificationsService = {
  async list(params: ListParams & { unreadOnly?: string; category?: string } = {}): Promise<NotificationListResultWithMeta> {
    const { data } = await api.get<NotificationListResultWithMeta>("/notifications", { params });
    return data;
  },

  async getUnreadCount(): Promise<number> {
    const { data } = await api.get<number>("/notifications/unread-count");
    return data;
  },

  async markRead(id: string): Promise<Notification> {
    const { data } = await api.patch<Notification>(`/notifications/${id}/read`);
    return data;
  },

  async markAllRead(): Promise<void> {
    await api.patch("/notifications/read-all");
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },

  async createTest(input: { title: string; message: string; type?: NotificationType; category?: string }): Promise<Notification> {
    const { data } = await api.post<Notification>("/notifications/test", input);
    return data;
  },
};
