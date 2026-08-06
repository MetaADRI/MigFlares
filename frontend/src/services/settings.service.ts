import type { SettingsMap } from "@/types";
import { api } from "@/services/api";

export const settingsService = {
  async get(): Promise<SettingsMap> {
    const { data } = await api.get<SettingsMap>("/settings");
    return data;
  },

  async update(values: Record<string, string>): Promise<SettingsMap> {
    const { data } = await api.patch<SettingsMap>("/settings", values);
    return data;
  },

  async reset(): Promise<SettingsMap> {
    const { data } = await api.post<SettingsMap>("/settings/reset");
    return data;
  },
};
