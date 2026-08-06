import type { LoginRecord, User } from "@/types";
import { api } from "@/services/api";

export interface ProfileInput {
  fullName?: string;
  phone?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

export const profileService = {
  async update(input: ProfileInput): Promise<User> {
    const { data } = await api.patch<User>("/auth/profile", input);
    return data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post("/auth/change-password", { currentPassword, newPassword });
  },

  async loginHistory(): Promise<LoginRecord[]> {
    const { data } = await api.get<LoginRecord[]>("/auth/login-history");
    return data;
  },
};
