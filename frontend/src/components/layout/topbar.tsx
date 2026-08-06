import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut, Menu, Search, Settings, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { findNavItem, NOTIFICATION_CATEGORY_META } from "@/constants";
import { useAuth } from "@/hooks/use-auth";
import { notificationsService } from "@/services/notifications.service";
import { timeAgo } from "@/utils/format";
import { cn } from "@/utils/cn";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [preview, setPreview] = useState<{ id: string; title: string; message: string; category: string; createdAt: string }[]>([]);

  const refreshNotifications = useCallback(() => {
    void notificationsService.getUnreadCount().then(setUnreadCount).catch(() => undefined);
    void notificationsService
      .list({ pageSize: 4 })
      .then((res) => setPreview(res.data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshNotifications();
    const timer = window.setInterval(refreshNotifications, 45_000);
    return () => window.clearInterval(timer);
  }, [refreshNotifications]);

  const nav = findNavItem(location.pathname);
  const title = nav?.label ?? "Mig Flares";

  const submitSearch = () => {
    const q = query.trim();
    navigate(q ? `/wash-jobs?search=${encodeURIComponent(q)}` : "/wash-jobs");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open navigation">
          <Menu />
        </Button>

        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {title}
          </h2>
        </div>

        {/* Search */}
        <div className="relative hidden w-56 md:block lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitSearch()}
            placeholder="Search wash jobs…"
            className="h-9.5 w-full rounded-xl border border-border/70 bg-card pl-9 pr-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>

        {/* Notifications */}
        <DropdownMenu onOpenChange={(open) => open && refreshNotifications()}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="size-[18px]" />
              {unreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white ring-2 ring-background">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
                {unreadCount} new
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {preview.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up</div>
            ) : (
              preview.map((n) => (
                <DropdownMenuItem key={n.id} className="items-start gap-3 py-2.5">
                  <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", NOTIFICATION_CATEGORY_META[n.category]?.dot ?? "bg-orange-500")} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{n.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{n.message}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground/70">{timeAgo(n.createdAt)}</span>
                  </span>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-xs font-medium text-primary" onClick={() => navigate("/notifications")}>
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-muted/70"
              aria-label="Account menu"
            >
              <Avatar name={user?.fullName ?? "User"} src={user?.avatarUrl} size="sm" />
              <span className="hidden text-left sm:block">
                <span className="block max-w-[140px] truncate text-sm font-medium leading-tight text-foreground">
                  {user?.fullName}
                </span>
                <span className="block text-[11px] capitalize leading-tight text-muted-foreground">
                  {user?.role.toLowerCase()}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>My account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <UserRound /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => logout()}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function logout() {
  localStorage.removeItem("mf_access_token");
  localStorage.removeItem("mf_refresh_token");
  localStorage.removeItem("mf_user");
  window.location.assign("/login");
}
