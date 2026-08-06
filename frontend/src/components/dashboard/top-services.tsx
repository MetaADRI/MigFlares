import { Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { TopService } from "@/types";
import { formatCurrency } from "@/utils/format";

interface TopServicesProps {
  services: TopService[];
  loading?: boolean;
}

export function TopServices({ services, loading }: TopServicesProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] sm:p-6">
      <div className="flex items-center gap-2.5">
        <div className="grid size-8 place-items-center rounded-lg bg-orange-50 text-orange-600">
          <Sparkles className="size-4" />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
            Top Services
          </h3>
          <p className="text-xs text-muted-foreground">By revenue · 30 days</p>
        </div>
      </div>

      <div className="mt-5 flex-1 space-y-4">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
          : services.map((service) => (
              <div key={service.id}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{service.name}</p>
                  <p className="shrink-0 text-sm font-semibold text-foreground">
                    {formatCurrency(service.revenue)}
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Progress value={service.percentage} className="h-1.5" />
                  <span className="w-8 shrink-0 text-right text-[11px] text-muted-foreground">
                    {service.percentage}%
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {service.count} wash{service.count === 1 ? "" : "es"}
                </p>
              </div>
            ))}
        {!loading && services.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
        ) : null}
      </div>
    </div>
  );
}
