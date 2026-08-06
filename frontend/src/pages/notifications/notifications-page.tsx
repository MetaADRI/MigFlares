import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BellOff, BellRing, Check, CheckCheck, Info, MailOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NOTIFICATION_CATEGORIES, NOTIFICATION_CATEGORY_LABEL, NOTIFICATION_CATEGORY_META } from "@/constants";
import { notificationsService } from "@/services/notifications.service";
import type { Notification, NotificationType } from "@/types";
import { cn } from "@/utils/cn";
import { timeAgo } from "@/utils/format";

const TYPE_ICON: Record<NotificationType, { icon: typeof Info; className: string }> = {
  INFO: { icon: Info, className: "bg-sky-50 text-sky-600" },
  SUCCESS: { icon: Check, className: "bg-emerald-50 text-emerald-600" },
  WARNING: { icon: BellRing, className: "bg-amber-50 text-amber-600" },
  ERROR: { icon: BellOff, className: "bg-red-50 text-red-600" },
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async (cat: string, unread: boolean, pageNo: number) => {
    setLoading(true);
    setError(false);
    try {
      const res = await notificationsService.list({
        page: pageNo,
        pageSize: 12,
        category: cat,
        ...(unread ? { unreadOnly: "true" } : {}),
      });
      setItems(res.data);
      setUnreadCount(res.unreadCount);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(category, unreadOnly, 1);
  }, [load, category, unreadOnly]);

  const markRead = async (id: string) => {
    await notificationsService.markRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await notificationsService.markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    toast.success("All notifications marked as read");
  };

  const remove = async (id: string) => {
    await notificationsService.remove(id);
    setItems((prev) => prev.filter((n) => n.id !== id));
    toast.success("Notification deleted");
  };

  const hasUnread = useMemo(() => items.some((n) => !n.isRead), [items]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="System alerts, inventory warnings, expense approvals and reminders."
      >
        <Button variant="outline" size="sm" onClick={markAllRead} disabled={!hasUnread}>
          <CheckCheck /> Mark all read
        </Button>
      </PageHeader>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-1 flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setCategory("ALL");
              setPage(1);
            }}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
              category === "ALL" ? "bg-orange-50 text-orange-700" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            All
          </button>
          {NOTIFICATION_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => {
                setCategory(c.value);
                setPage(1);
              }}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
                category === c.value ? "bg-orange-50 text-orange-700" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-orange-200">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => {
              setUnreadOnly(e.target.checked);
              setPage(1);
            }}
            className="size-3.5 rounded accent-[#F47B20]"
          />
          Unread only
        </label>
      </div>

      {loading ? (
        <LoadingState label="Loading notifications…" />
      ) : error ? (
        <ErrorState message="Could not load notifications." onRetry={() => void load(category, unreadOnly, page)} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 py-20 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <BellOff className="size-6" />
          </div>
          <h3 className="mt-4 font-display text-base font-semibold text-foreground">No notifications</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {unreadOnly ? "You have no unread notifications." : "Notifications will appear here as activity happens."}
          </p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2.5">
          {items.map((n) => {
            const meta = TYPE_ICON[n.type];
            const Icon = meta.icon;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "group flex items-start gap-4 rounded-2xl border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors",
                  n.isRead ? "border-border/60" : "border-orange-200/70 bg-orange-50/[0.35]",
                )}
              >
                <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl", meta.className)}>
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className={cn("text-sm", n.isRead ? "font-medium text-foreground/80" : "font-semibold text-foreground")}>
                      {n.title}
                    </h4>
                    <Badge variant="secondary" className={cn("text-[10px]", NOTIFICATION_CATEGORY_META[n.category]?.className)}>
                      {NOTIFICATION_CATEGORY_LABEL[n.category] ?? n.category}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground/70">{timeAgo(n.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {!n.isRead ? (
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => void markRead(n.id)} aria-label="Mark as read">
                      <MailOpen className="size-4" />
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => void remove(n.id)} aria-label="Delete">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
          <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground">
            <span>{unreadCount} unread</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage((p) => p - 1); void load(category, unreadOnly, page - 1); }}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={items.length < 12} onClick={() => { setPage((p) => p + 1); void load(category, unreadOnly, page + 1); }}>
                Next
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
