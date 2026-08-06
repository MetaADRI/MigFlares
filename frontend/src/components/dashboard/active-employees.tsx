import { Link } from "react-router-dom";
import { Medal, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardInsights } from "@/types";
import { formatCurrency } from "@/utils/format";

interface ActiveEmployeesProps {
  employees: DashboardInsights["activeEmployees"];
  loading?: boolean;
}

/** Dashboard panel — top 5 employees by completed washes. */
export function ActiveEmployees({ employees, loading }: ActiveEmployeesProps) {
  const max = Math.max(1, ...employees.map((e) => e.washes));

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">Most active</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">Employees by washes completed</p>
        </div>
        <div className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
          <Users className="size-4.5" />
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-2.5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Medal className="size-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No staff activity recorded.</p>
          </div>
        ) : (
          employees.map((e, i) => (
            <div key={e.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5">
              <span
                className={
                  i === 0
                    ? "grid size-6 shrink-0 place-items-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700"
                    : "grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground"
                }
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{e.name}</p>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {e.washes} · {formatCurrency(e.revenue)}
                  </p>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-500 transition-all duration-700"
                    style={{ width: `${(e.washes / max) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Link
        to="/employees"
        className="mt-4 block rounded-xl border border-dashed border-border/70 py-2.5 text-center text-xs font-medium text-primary transition-colors hover:border-orange-300 hover:bg-orange-50/40"
      >
        View team →
      </Link>
    </div>
  );
}
