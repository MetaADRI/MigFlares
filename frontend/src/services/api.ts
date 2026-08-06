import axios from "axios";

/** Central axios instance with JWT injection and 401 handling. */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 20_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("mf_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === "object" && "success" in body && "data" in body) {
      response.data = body.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const wasAuthenticated = Boolean(localStorage.getItem("mf_access_token"));
      const isLoginCall = String(error.config?.url ?? "").includes("/auth/login");
      localStorage.removeItem("mf_access_token");
      localStorage.removeItem("mf_refresh_token");
      localStorage.removeItem("mf_user");
      // Expired session while logged in → session page; failed logins stay on the form.
      const onAuthPages =
        window.location.pathname === "/login" || window.location.pathname === "/session-expired";
      if (wasAuthenticated && !isLoginCall && !onAuthPages) {
        window.location.assign("/session-expired");
      }
    }
    return Promise.reject(error);
  },
);
