import { ArrowDown, ArrowUp, ArrowUpDown, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/status-badge";
import { CUSTOMER_STATUS_META } from "@/constants";
import type { Customer } from "@/types";
import { cn } from "@/utils/cn";
import { formatCurrency, formatDate } from "@/utils/format";

interface CustomerTableProps {
  customers: Customer[];
  loading: boolean;
  sortBy: string;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

function SortableTh({
  label,
  sortKey,
  sortBy,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: string;
  sortBy: string;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
  className?: string;
}) {
  const active = sortBy === sortKey;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-50" />
        )}
      </button>
    </TableHead>
  );
}

export function CustomerTable({
  customers,
  loading,
  sortBy,
  sortDir,
  onSort,
  onView,
  onEdit,
  onDelete,
}: CustomerTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <SortableTh label="Customer" sortKey="name" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
          <TableHead>Status</TableHead>
          <SortableTh label="Vehicles" sortKey="vehicles" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
          <SortableTh label="Visits" sortKey="visits" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
          <SortableTh label="Total Spent" sortKey="totalSpent" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
          <SortableTh label="Last Visit" sortKey="lastVisitAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
          <TableHead className="w-12 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                <TableCell colSpan={7}>
                  <Skeleton className="h-10 w-full" />
                </TableCell>
              </TableRow>
            ))
          : customers.map((customer) => {
              const status = CUSTOMER_STATUS_META[customer.status];
              return (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={`${customer.firstName} ${customer.lastName}`} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {customer.firstName} {customer.lastName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{customer.phone}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge meta={status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">—</TableCell>
                  <TableCell className="text-sm font-medium text-foreground">{customer.visits}</TableCell>
                  <TableCell className="text-sm font-semibold text-foreground">
                    {formatCurrency(customer.totalSpent)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(customer.lastVisitAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Customer actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => onView(customer)}>
                          <Eye /> View profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(customer)}>
                          <Pencil /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(customer)}
                        >
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
      </TableBody>
    </Table>
  );
}
