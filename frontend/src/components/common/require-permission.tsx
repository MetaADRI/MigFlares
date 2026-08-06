import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { usePermission } from "@/context/permission-context";
import { PATH_PERMISSIONS } from "@/constants";

interface RequirePermissionProps {
  permission: string;
  children: ReactNode;
  /** Redirect target when denied (defaults to the dashboard). */
  fallback?: string;
}

/** Route-level guard: renders children only when the permission is granted. */
export function RequirePermission({ permission, children, fallback = "/" }: RequirePermissionProps) {
  const { hasPermission } = usePermission();
  if (!hasPermission(permission)) {
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
}

/** Guards any app route using the PATH_PERMISSIONS registry (single source of truth). */
export function GuardedRoute({ children }: { children: ReactNode }) {
  const { hasPermission } = usePermission();
  const location = useLocation();
  const permission = PATH_PERMISSIONS[location.pathname];
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/403" replace />;
  }
  return <>{children}</>;
}
