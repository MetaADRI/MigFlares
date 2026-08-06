import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { CUSTOMER_STATUS_META } from "@/constants";
import type { Customer } from "@/types";
import { formatCurrency, timeAgo } from "@/utils/format";

interface RecentCustomersProps {
  customers: Customer[];
  loading?: boolean;
}

export function RecentCustomers({ customers, loading }: RecentCustomersProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between p-5 pb-3 sm:p-6 sm:pb-3">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
            Recent Customers
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">Most recently served</p>
        </div>
        <Link
          to="/customers"
          className="inline-flex items-center gap-0.5 text-xs font-medium text-primary transition-colors hover:text-orange-600"
        >
          All customers <ChevronRight className="size-3.5" />
        </Link>
      </div>

      <div className="grid gap-2 px-5 pb-5 sm:grid-cols-2 sm:px-6 sm:pb-6 lg:grid-cols-3 xl:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)
          : customers.map((customer) => {
              const status = CUSTOMER_STATUS_META[customer.status];
              return (
                <Link
                  key={customer.id}
                  to={`/customers?id=${customer.id}`}
                  className="group flex items-center gap-3 rounded-xl border border-border/60 bg-background/50 p-3 transition-all duration-200 hover:border-primary/30 hover:bg-orange-50/40"
                >
                  <Avatar
                    name={`${customer.firstName} ${customer.lastName}`}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {customer.firstName} {customer.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {customer.lastVisitAt
                        ? `Last visit ${timeAgo(customer.lastVisitAt)}`
                        : "No visits yet"}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={status.dot ? `size-1.5 rounded-full ${status.dot}` : ""} />
                      <span className="text-[11px] text-muted-foreground">
                        {formatCurrency(customer.totalSpent)} total
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
      </div>
    </div>
  );
}
