import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClassName?: string;
  trend?: number;
  trendLabel?: string;
  index?: number;
}

/** KPI card used across the dashboard. */
export function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  trend,
  trendLabel = "vs yesterday",
  index = 0,
}: StatCardProps) {
  const positive = (trend ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-[0_2px_6px_rgba(0,0,0,0.05),0_16px_32px_-12px_rgba(0,0,0,0.14)]"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 truncate font-display text-[26px] font-bold tracking-tight text-foreground">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600 transition-transform duration-300 group-hover:scale-110",
            iconClassName,
          )}
        >
          <Icon className="size-5" strokeWidth={2.2} />
        </div>
      </div>
      {trend !== undefined ? (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold",
              positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
            )}
          >
            {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {Math.abs(trend)}%
          </span>
          <span className="text-muted-foreground">{trendLabel}</span>
        </div>
      ) : null}
    </motion.div>
  );
}
