import { Link } from "react-router-dom";
import { AlertTriangle, Banknote, Droplets, UserPlus, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityItem } from "@/types";
import { timeAgo } from "@/utils/format";
import { cn } from "@/utils/cn";

const TYPE_META: Record<ActivityItem["type"], { icon: LucideIcon; className: string }> = {
  wash: { icon: Droplets, className: "bg-sky-50 text-sky-600" },
  payment: { icon: Banknote, className: "bg-emerald-50 text-emerald-600" },
  customer: { icon: UserPlus, className: "bg-purple-50 text-purple-600" },
  system: { icon: AlertTriangle, className: "bg-amber-50 text-amber-600" },
};

interface RecentActivityProps {
  items: ActivityItem[];
  loading?: boolean;
}

export function RecentActivity({ items, loading }: RecentActivityProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between p-5 pb-3 sm:p-6 sm:pb-3">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
            Recent Activity
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">Latest happenings at the bay</p>
        </div>
        <Link
          to="/wash-jobs"
          className="text-xs font-medium text-primary transition-colors hover:text-orange-600"
        >
          View all
        </Link>
      </div>

      <div className="flex-1 divide-y divide-border/60 px-2 pb-2 sm:px-3">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="mx-3 my-2 h-11" />)
          : items.map((item, index) => {
              const meta = TYPE_META[item.type];
              return (
                <div
                  key={item.id}
                  className={cn("flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/40", index === 0 && "animate-fade-in-up")}
                >
                  <div className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg", meta.className)}>
                    <meta.icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground/80">
                    {timeAgo(item.time)}
                  </span>
                </div>
              );
            })}
      </div>
    </div>
  );
}
