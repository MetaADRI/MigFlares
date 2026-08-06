import { Link } from "react-router-dom";
import { ReceiptText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardInsights } from "@/types";
import { formatCurrency, timeAgo } from "@/utils/format";

interface LatestReceiptsProps {
  receipts: DashboardInsights["latestReceipts"];
  loading?: boolean;
}

/** Dashboard panel — the five most recent receipts. */
export function LatestReceipts({ receipts, loading }: LatestReceiptsProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">Latest receipts</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">Most recent transactions</p>
        </div>
        <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
          <ReceiptText className="size-4.5" />
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-2.5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
        ) : receipts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ReceiptText className="size-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No receipts issued yet.</p>
          </div>
        ) : (
          receipts.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold text-foreground">{r.receiptNo}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.customerName} · {r.plateNumber || "—"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-foreground">{formatCurrency(r.total)}</p>
                <p className="text-[11px] text-muted-foreground">{timeAgo(r.issuedAt)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <Link
        to="/receipts"
        className="mt-4 block rounded-xl border border-dashed border-border/70 py-2.5 text-center text-xs font-medium text-primary transition-colors hover:border-orange-300 hover:bg-orange-50/40"
      >
        Receipt archive →
      </Link>
    </div>
  );
}
