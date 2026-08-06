import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ALL_PERMISSION_KEYS, ROLE_DEFAULT_PERMISSIONS } from "@/constants";
import { useAuth } from "@/hooks/use-auth";

interface PermissionContextValue {
  permissions: string[];
  hasPermission: (key: string) => boolean;
  hasAny: (keys: string[]) => boolean;
  isOwner: boolean;
}

export const PermissionContext = createContext<PermissionContextValue | null>(null);

/** Resolves the current user's effective permissions from their role. */
export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const value = useMemo<PermissionContextValue>(() => {
    const role = user?.role ?? "ATTENDANT";
    const permissions =
      role === "OWNER" ? [...ALL_PERMISSION_KEYS] : [...(ROLE_DEFAULT_PERMISSIONS[role] ?? [])];
    const set = new Set(permissions);
    return {
      permissions,
      hasPermission: (key: string) => set.has(key),
      hasAny: (keys: string[]) => keys.some((k) => set.has(k)),
      isOwner: role === "OWNER",
    };
  }, [user]);

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermission(): PermissionContextValue {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error("usePermission must be used within a PermissionProvider");
  return ctx;
}
