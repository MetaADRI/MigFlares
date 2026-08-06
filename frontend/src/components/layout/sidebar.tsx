import { NavLink, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/common/logo";
import { Avatar } from "@/components/ui/avatar";
import { BRAND, NAV_GROUPS, PATH_PERMISSIONS } from "@/constants";
import { useAuth } from "@/hooks/use-auth";
import { usePermission } from "@/context/permission-context";
import { cn } from "@/utils/cn";

/** Shared sidebar body (desktop aside + mobile drawer). */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const { hasPermission } = usePermission();
  const location = useLocation();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
        <Logo />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter((item) => hasPermission(PATH_PERMISSIONS[item.path] ?? "dashboard:view"));
          if (visible.length === 0) return null;
          return (
          <div key={group.label} className="mb-5">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-muted">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {visible.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-white/[0.08] text-white"
                        : "text-sidebar-muted hover:bg-white/[0.05] hover:text-white",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "size-[18px] shrink-0 transition-colors duration-200",
                        active ? "text-orange-400" : "text-sidebar-muted group-hover:text-white",
                      )}
                      strokeWidth={active ? 2.4 : 2}
                    />
                    <span className="truncate">{item.label}</span>
                    {active ? <span className="ml-auto size-1.5 shrink-0 rounded-full bg-orange-400" aria-hidden /> : null}
                  </NavLink>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5">
          <Avatar name={user?.fullName ?? "User"} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.fullName}</p>
            <p className="truncate text-[11px] capitalize text-sidebar-muted">
              {user?.role.toLowerCase()} · {BRAND.shortName}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="mt-1.5 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-muted transition-colors hover:bg-white/[0.05] hover:text-white"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

/** Fixed desktop sidebar. */
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-sidebar-border bg-sidebar lg:block">
      <SidebarContent />
    </aside>
  );
}
