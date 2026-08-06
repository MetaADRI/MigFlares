import type { User } from "@/types";
import { api } from "@/services/api";

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async login(username: string, password: string): Promise<AuthResponse> {
    // 60s timeout: the Render free instance can sleep after idle and needs
    // up to ~50s to cold-start. A short timeout made the first login after
    // idle fail with a misleading "invalid credentials" error.
    const { data } = await api.post<AuthResponse>(
      "/auth/login",
      { username, password },
      { timeout: 60_000 },
    );
    return data;
  },

  async getMe(): Promise<User> {
    const { data } = await api.get<User>("/auth/me");
    return data;
  },

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } catch {
      /* best-effort — session is cleared client-side regardless */
    }
  },
};
