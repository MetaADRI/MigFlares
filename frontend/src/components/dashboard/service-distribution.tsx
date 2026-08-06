import { Link } from "react-router-dom";
import { PieChart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardInsights } from "@/types";
import { formatCurrency } from "@/utils/format";

interface ServiceDistributionProps {
  services: DashboardInsights["serviceDistribution"];
  loading?: boolean;
}

/** Dashboard panel — revenue share by service as proportional bars. */
export function ServiceDistribution({ services, loading }: ServiceDistributionProps) {
  const max = Math.max(1, ...services.map((s) => s.revenue));
  const total = services.reduce((sum, s) => sum + s.revenue, 0);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">Service distribution</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">Revenue share by service</p>
        </div>
        <div className="grid size-9 place-items-center rounded-xl bg-sky-50 text-sky-600">
          <PieChart className="size-4.5" />
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-3.5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <PieChart className="size-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No completed washes yet.</p>
          </div>
        ) : (
          services.map((s) => {
            const pct = total > 0 ? Math.round((s.revenue / total) * 100) : 0;
            return (
              <div key={s.name}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-medium text-foreground">{s.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatCurrency(s.revenue)} · {pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-primary transition-all duration-700"
                    style={{ width: `${(s.revenue / max) * 100}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <Link
        to="/services"
        className="mt-4 block rounded-xl border border-dashed border-border/70 py-2.5 text-center text-xs font-medium text-primary transition-colors hover:border-orange-300 hover:bg-orange-50/40"
      >
        Manage services →
      </Link>
    </div>
  );
}
