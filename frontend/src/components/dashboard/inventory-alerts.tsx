import { Link } from "react-router-dom";
import { AlertTriangle, PackageX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { InventoryAlert } from "@/types";
import { cn } from "@/utils/cn";

interface InventoryAlertsProps {
  alerts: InventoryAlert[];
  loading?: boolean;
}

/** Dashboard panel — items at or below reorder level. */
export function InventoryAlerts({ alerts, loading }: InventoryAlertsProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">Inventory alerts</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">Items below reorder level</p>
        </div>
        <div className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
          <AlertTriangle className="size-4.5" />
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-2.5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <PackageX className="size-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">All stock levels are healthy.</p>
          </div>
        ) : (
          alerts.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {item.sku} · {item.quantityAvailable} {item.unit} left
                </p>
              </div>
              <Badge
                variant="secondary"
                className={cn("shrink-0", item.outOfStock ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200")}
              >
                {item.outOfStock ? "Out" : "Low"}
              </Badge>
            </div>
          ))
        )}
      </div>

      <Link
        to="/inventory"
        className="mt-4 block rounded-xl border border-dashed border-border/70 py-2.5 text-center text-xs font-medium text-primary transition-colors hover:border-orange-300 hover:bg-orange-50/40"
      >
        Manage inventory →
      </Link>
    </div>
  );
}
