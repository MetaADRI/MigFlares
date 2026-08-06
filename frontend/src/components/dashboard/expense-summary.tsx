import { Link } from "react-router-dom";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { DashboardInsights } from "@/types";
import { EXPENSE_CATEGORY_LABEL } from "@/constants";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/utils/cn";

interface ExpenseSummaryProps {
  summary: DashboardInsights["expenseSummary"] | null;
  loading?: boolean;
}

/** Dashboard panel — monthly spend, pending approvals and the largest expense. */
export function ExpenseSummary({ summary, loading }: ExpenseSummaryProps) {
  if (loading || !summary) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] sm:p-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-4 h-10 w-40" />
        <Skeleton className="mt-4 h-16 w-full" />
      </div>
    );
  }

  const positive = summary.monthlyTrend >= 0;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">Expenses</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">This month</p>
        </div>
        <div className="grid size-9 place-items-center rounded-xl bg-purple-50 text-purple-600">
          <Wallet className="size-4.5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <p className="font-display text-[26px] font-bold tracking-tight text-foreground">{formatCurrency(summary.monthlyExpenses)}</p>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
            positive ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700",
          )}
        >
          {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
          {Math.abs(summary.monthlyTrend)}%
        </span>
      </div>

      <div className="mt-4 flex-1 space-y-2.5">
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5">
          <span className="text-xs text-muted-foreground">Pending approval</span>
          <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
            {summary.pendingApprovals}
          </Badge>
        </div>
        {summary.largestExpense ? (
          <div className="rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Largest expense</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
              {formatCurrency(summary.largestExpense.amount)}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {EXPENSE_CATEGORY_LABEL[summary.largestExpense.category] ?? summary.largestExpense.category}
              </span>
            </p>
          </div>
        ) : null}
      </div>

      <Link
        to="/expenses"
        className="mt-4 block rounded-xl border border-dashed border-border/70 py-2.5 text-center text-xs font-medium text-primary transition-colors hover:border-orange-300 hover:bg-orange-50/40"
      >
        View expenses →
      </Link>
    </div>
  );
}
